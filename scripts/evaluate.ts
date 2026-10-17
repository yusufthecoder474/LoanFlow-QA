import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../server/db";
type Defect = { id: string; description: string; probes: string[] };
type Result = { status: string; errors?: { message?: string }[] };
type Spec = { title: string; tests: { results: Result[] }[] };
type Suite = { suites?: Suite[]; specs?: Spec[] };
type Report = Suite & {
  stats: {
    duration: number;
    expected: number;
    unexpected: number;
    skipped: number;
  };
  errors?: unknown[];
};
const definitions: Defect[] = JSON.parse(
  await readFile("experiments/defects.json", "utf8"),
);
async function run(
  script: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  log: string,
) {
  const chunks: string[] = [];
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (d) => chunks.push(String(d)));
    child.stderr.on("data", (d) => chunks.push(String(d)));
    child.once("error", reject);
    child.once("close", (c) => resolve(c ?? 1));
  });
  await writeFile(log, chunks.join(""));
  return exitCode;
}
function flatten(s: Suite): Spec[] {
  return [...(s.specs ?? []), ...(s.suites ?? []).flatMap(flatten)];
}
const root = path.resolve("artifacts/runs");
await mkdir(root, { recursive: true });
const environment = (await db.query("SELECT version() AS version")).rows[0]
  .version as string;
await db.end();
type RunResult = {
  defect: string;
  approach: string;
  detected: boolean;
  exitCode: number;
  passed: number;
  failed: number;
  durationMs: number;
  failedTests: string[];
  examples: { test: string; message: string }[];
};
const rows: RunResult[] = [];
for (const defect of [
  { id: "clean", description: "Baseline", probes: [] },
  ...definitions,
]) {
  for (const approach of ["A", "B"]) {
    const name = `${defect.id}-${approach}`,
      dir = path.join(root, name);
    await mkdir(dir, { recursive: true });
    const env = {
      ...process.env,
      CI: "true",
      FAULT: defect.id === "clean" ? "" : defect.id,
      ENABLE_FAULTS: defect.id === "clean" ? "false" : "true",
      PW_JSON: path.join(dir, "results.json"),
      PW_HTML: path.join(dir, "html"),
      PW_OUTPUT: path.join(dir, "test-results"),
    };
    // Every cell gets fresh synthetic data and fresh API/Vite processes. Existing servers must be stopped.
    if (
      (await run(
        "--import",
        ["tsx", "scripts/seed.ts"],
        env,
        path.join(dir, "seed.log"),
      )) !== 0
    )
      throw new Error("Seed failed; inspect seed.log");
    const args = [
      "test",
      "--project=chromium",
      ...(approach === "A" ? ["tests/ui.spec.ts"] : []),
    ];
    const code = await run(
      "node_modules/@playwright/test/cli.js",
      args,
      env,
      path.join(dir, "run.log"),
    );
    const report: Report = JSON.parse(
      await readFile(path.join(dir, "results.json"), "utf8"),
    );
    const failed = flatten(report).filter((s) =>
      s.tests.some((t) => t.results.some((r) => r.status !== "passed")),
    );
    if (report.errors?.length || report.stats.skipped > 0)
      throw new Error(`Incomplete run: ${name}`);
    const detected =
      defect.id !== "clean" &&
      failed.some((s) => defect.probes.some((p) => s.title.startsWith(p)));
    const examples = failed.slice(0, 3).map((s) => ({
      test: s.title,
      message: s.tests
        .flatMap((t) => t.results.flatMap((r) => r.errors ?? []))
        .map((e) => e.message ?? "")
        .join("\n"),
    }));
    rows.push({
      defect: defect.id,
      approach,
      detected,
      exitCode: code,
      passed: report.stats.expected,
      failed: report.stats.unexpected,
      durationMs: report.stats.duration,
      failedTests: failed.map((s) => s.title),
      examples,
    });
    console.log(
      `${name}: ${report.stats.expected} passed, ${report.stats.unexpected} failed; detected=${detected}`,
    );
  }
}
const summary = ["A", "B"].map((approach) => {
  const subset = rows.filter(
    (r) => r.approach === approach && r.defect !== "clean",
  );
  const detected = subset.filter((r) => r.detected).length;
  return {
    approach,
    detected,
    total: definitions.length,
    recall: detected / definitions.length,
    falsePositiveCount: rows.find(
      (r) => r.defect === "clean" && r.approach === approach,
    )!.failed,
    mutantDurationMs: subset.reduce((n, r) => n + r.durationMs, 0),
  };
});
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/evaluation-results.json",
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      database: environment,
      browserExecutable:
        process.env.CHROMIUM_PATH ?? "Playwright bundled Chromium",
      runs: rows,
      summary,
    },
    null,
    2,
  ),
);
const table = rows
  .map(
    (r) =>
      `| ${r.defect} | ${r.approach} | ${r.detected ? "yes" : "no"} | ${r.passed} | ${r.failed} | ${(r.durationMs / 1000).toFixed(2)} |`,
  )
  .join("\n");
await writeFile(
  "artifacts/evaluation-table.md",
  `| Defect | Approach | Detected | Passed | Failed | Seconds |\n|---|---|---|---:|---:|---:|\n${table}\n`,
);
// Expected mutant failures are data, not an intentionally failing standard CI run.
if (
  summary.some((s) => s.falsePositiveCount > 0) ||
  summary.find((s) => s.approach === "B")!.detected !== definitions.length
)
  process.exitCode = 1;
