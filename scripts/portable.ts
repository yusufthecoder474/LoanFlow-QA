import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { spawn } from "node:child_process";
// Explicit fallback for restricted environments. Docker PostgreSQL remains the primary setup.
const pg = await PGlite.create();
const server = new PGLiteSocketServer({
  db: pg,
  host: "127.0.0.1",
  port: 5432,
  maxConnections: 20,
});
await server.start();
console.log(
  "Portable verification DB:",
  (await pg.query<{ version: string }>("SELECT version()")).rows[0].version,
);
const env = {
  ...process.env,
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
};
async function run(args: string[]) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}
try {
  for (const task of ["migrate", "seed"]) {
    const code = await run(["--import", "tsx", `scripts/${task}.ts`]);
    if (code) throw new Error(`${task} failed`);
  }
  const mode = process.argv[2] ?? "test";
  const args =
    mode === "demo"
      ? ["--import", "tsx", "scripts/demo.ts"]
      : mode === "explore"
        ? ["--import", "tsx", "scripts/explore.ts"]
        : mode === "evaluate"
          ? ["--import", "tsx", "scripts/evaluate.ts"]
          : mode === "firefox"
            ? [
                "node_modules/@playwright/test/cli.js",
                "test",
                "--project=firefox-smoke",
              ]
            : [
                "node_modules/@playwright/test/cli.js",
                "test",
                "--project=chromium",
              ];
  process.exitCode = await run(args);
} finally {
  await server.stop();
  await pg.close();
}
