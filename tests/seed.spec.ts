import { test, expect } from "./fixtures";
test("agent exploration seed", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sign in to your workspace" }),
  ).toBeVisible();
});
