import { defineConfig } from "@playwright/test";
import standard from "./playwright.config";
// Run only the exploration seed through an optional agent, outside the regular suite.
export default defineConfig({
  ...standard,
  testIgnore: [],
  testMatch: "seed.spec.ts",
  projects: standard.projects?.filter((p) => p.name === "chromium"),
});
