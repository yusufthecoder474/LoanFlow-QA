import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testIgnore: "seed.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 20_000,
  expect: { timeout: 5_000 },
  forbidOnly: !!process.env.CI,
  outputDir: process.env.PW_OUTPUT ?? "test-results",
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: process.env.PW_HTML ?? "playwright-report",
        open: "never",
      },
    ],
    [
      "json",
      { outputFile: process.env.PW_JSON ?? "artifacts/standard-results.json" },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:5173",
    launchOptions: process.env.CHROMIUM_PATH
      ? {
          executablePath: process.env.CHROMIUM_PATH,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
        }
      : {},
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "firefox-smoke",
      testMatch: "ui.spec.ts",
      grep: /@smoke/,
      use: { ...devices["Desktop Firefox"], launchOptions: {} },
    },
  ],
  webServer: process.env.EXTERNAL_SERVER
    ? undefined
    : [
        {
          command: "npm run start:api",
          url: "http://127.0.0.1:3001/api/health",
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
        {
          command: "npm run dev:web",
          url: "http://127.0.0.1:5173",
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      ],
});
