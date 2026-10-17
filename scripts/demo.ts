import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { LoginPage } from "../tests/pages/LoginPage";
import { ApplicationPage } from "../tests/pages/ApplicationPage";
import { ReviewPage } from "../tests/pages/ReviewPage";
import { data } from "../tests/helpers/data";
const processes = [
  spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    stdio: "ignore",
  }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "ignore",
  }),
];
async function ready(url: string) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* server starting */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server did not start");
}
try {
  await ready("http://127.0.0.1:3001/api/health");
  await ready("http://127.0.0.1:5173");
  await mkdir("artifacts/demo", { recursive: true });
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      baseURL: "http://127.0.0.1:5173",
      viewport: { width: 1280, height: 1000 },
    });
    await page.goto("/");
    await page
      .getByRole("heading", { name: "Sign in to your workspace" })
      .waitFor();
    await page.screenshot({ path: "artifacts/demo/login.png", fullPage: true });
    const login = new LoginPage(page),
      application = new ApplicationPage(page),
      review = new ReviewPage(page);
    const d = data({ applicantName: "QA-Synthetic Home Buyer" });
    await login.login();
    await application.create(d);
    await application.upload(d.applicantName);
    await application.status(d.applicantName, "DRAFT");
    await page.screenshot({
      path: "artifacts/demo/applicant.png",
      fullPage: true,
    });
    await application.submit(d.applicantName);
    await application.status(d.applicantName, "SUBMITTED");
    await login.logout();
    await login.login("officer-north", "OFFICER");
    await review
      .card(d.applicantName)
      .getByLabel("Decision reason")
      .fill("Synthetic documents reviewed");
    await page.screenshot({
      path: "artifacts/demo/officer.png",
      fullPage: true,
    });
    await review.decide(
      d.applicantName,
      "APPROVED",
      "Synthetic documents reviewed",
    );
    await review.status(d.applicantName, "APPROVED");
    await login.logout();
    await login.login();
    await application.status(d.applicantName, "APPROVED");
    await page.screenshot({
      path: "artifacts/demo/approved.png",
      fullPage: true,
    });
    await writeFile(
      "artifacts/demo/observations.json",
      JSON.stringify(
        {
          method: "Regular Playwright browser automation (MCP was blocked)",
          browser: browser.version(),
          screens: [
            "login",
            "applicant draft with supporting PDF",
            "officer submitted review",
            "applicant final approval",
          ],
          recordedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log("Four synthetic demo screenshots captured");
  } finally {
    await browser.close();
  }
} finally {
  for (const p of processes) p.kill();
}
