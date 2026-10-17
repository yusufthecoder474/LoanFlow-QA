import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdir, writeFile } from "node:fs/promises";
const children: ReturnType<typeof spawn>[] = [];
const env = { ...process.env, FAULT: "", ENABLE_FAULTS: "false" };
async function ready(url: string) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* server starting */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server failed to start: ${url}`);
}
try {
  children.push(
    spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
      env,
      stdio: "ignore",
    }),
  );
  children.push(
    spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
      env,
      stdio: "ignore",
    }),
  );
  await ready("http://127.0.0.1:3001/api/health");
  await ready("http://127.0.0.1:5173");
  const args = [
    "node_modules/@playwright/mcp/cli.js",
    "--headless",
    "--isolated",
    "--no-sandbox",
    "--output-dir",
    "artifacts/demo",
  ];
  if (process.env.CHROMIUM_PATH)
    args.push("--executable-path", process.env.CHROMIUM_PATH);
  const mcp = spawn(process.execPath, args, {
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  children.push(mcp);
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  let id = 0;
  createInterface({ input: mcp.stdout! }).on("line", (line) => {
    try {
      const m = JSON.parse(line);
      if (m.id !== undefined) {
        const p = pending.get(m.id);
        pending.delete(m.id);
        if (m.error) p?.reject(new Error(JSON.stringify(m.error)));
        else p?.resolve(m.result);
      }
    } catch {
      /* non-protocol startup output */
    }
  });
  mcp.once("exit", () => {
    for (const p of pending.values()) p.reject(new Error("MCP exited"));
  });
  function rpc(method: string, params: unknown) {
    const n = ++id;
    return new Promise<unknown>((resolve, reject) => {
      pending.set(n, { resolve, reject });
      mcp.stdin!.write(
        JSON.stringify({ jsonrpc: "2.0", id: n, method, params }) + "\n",
      );
    });
  }
  await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "loanflow-local-explorer", version: "1.0.0" },
  });
  mcp.stdin!.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
      "\n",
  );
  const transcript: unknown[] = [];
  async function tool(name: string, args: Record<string, unknown>) {
    const result = await rpc("tools/call", { name, arguments: args });
    if ((result as { isError?: boolean }).isError)
      throw new Error(JSON.stringify(result));
    transcript.push({ tool: name, result });
    return result;
  }
  await tool("browser_navigate", { url: "http://127.0.0.1:5173" });
  await tool("browser_take_screenshot", {
    type: "png",
    filename: "login.png",
    fullPage: true,
  });
  await tool("browser_run_code", {
    code: `async (page) => {
 await page.getByRole('combobox', {name:'Account',exact:true}).selectOption('alice');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:'Applicant dashboard',exact:true}).waitFor();
 await page.getByLabel('Applicant name',{exact:true}).fill('QA-MCP-Example');
 await page.getByLabel('Monthly income',{exact:true}).fill('6000');
 await page.getByLabel('Requested loan amount',{exact:true}).fill('160000');
 await page.getByLabel('Property value',{exact:true}).fill('200000');
 await page.getByLabel('Loan purpose',{exact:true}).fill('Synthetic home purchase');
 await page.getByRole('button',{name:'Create draft'}).click();
 await page.getByRole('article',{name:'Application QA-MCP-Example',exact:true}).waitFor();
}`,
  });
  await tool("browser_snapshot", {});
  await tool("browser_take_screenshot", {
    type: "png",
    filename: "applicant.png",
    fullPage: true,
  });
  await tool("browser_run_code", {
    code: `async (page) => {
 await page.getByRole('button',{name:'Sign out'}).click();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
 await page.getByRole('combobox',{name:'Account',exact:true}).selectOption('officer-north');
 await page.getByRole('combobox',{name:'Role',exact:true}).selectOption('OFFICER');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:'Loan Officer dashboard',exact:true}).waitFor();
}`,
  });
  await tool("browser_snapshot", {});
  await tool("browser_take_screenshot", {
    type: "png",
    filename: "officer.png",
    fullPage: true,
  });
  await tool("browser_close", {});
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/mcp-exploration.json",
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        applicationUrl: "http://127.0.0.1:5173",
        transcript,
      },
      null,
      2,
    ),
  );
  console.log(
    "MCP explored all three screens; synthetic screenshots and transcript saved.",
  );
} finally {
  for (const child of children.reverse()) child.kill();
}
