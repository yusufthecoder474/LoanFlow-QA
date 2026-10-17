import { expect, type Page } from "@playwright/test";
export class LoginPage {
  constructor(readonly page: Page) {}
  async login(id = "alice", role = "APPLICANT") {
    await this.page.goto("/");
    await this.page
      .getByRole("combobox", { name: "Account", exact: true })
      .selectOption(id);
    await this.page
      .getByRole("combobox", { name: "Role", exact: true })
      .selectOption(role);
    await this.page.getByLabel("Password").fill("Demo123!");
    await this.page
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await expect(
      this.page.getByRole("heading", {
        name:
          role === "APPLICANT"
            ? "Applicant dashboard"
            : "Loan Officer dashboard",
        exact: true,
      }),
    ).toBeVisible();
  }
  async logout() {
    await this.page.getByRole("button", { name: "Sign out" }).click();
    await expect(
      this.page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
  }
}
