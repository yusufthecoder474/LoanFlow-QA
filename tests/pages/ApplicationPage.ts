import { expect, type Page } from "@playwright/test";
import type { LoanInput } from "../../shared/contracts";
import { pdf } from "../helpers/data";
export class ApplicationPage {
  constructor(readonly page: Page) {}
  card(name: string) {
    return this.page.getByRole("article", {
      name: `Application ${name}`,
      exact: true,
    });
  }
  async create(d: LoanInput) {
    for (const [label, value] of [
      ["Applicant name", d.applicantName],
      ["Monthly income", d.monthlyIncome],
      ["Requested loan amount", d.requestedLoan],
      ["Property value", d.propertyValue],
      ["Loan purpose", d.purpose],
    ] as const)
      await this.page.getByLabel(label, { exact: true }).fill(String(value));
    await this.page.getByRole("button", { name: "Create draft" }).click();
  }
  async upload(name: string) {
    await this.card(name).getByLabel("Supporting PDF").setInputFiles(pdf);
    await expect(
      this.card(name).getByText("supporting.pdf", { exact: true }),
    ).toBeVisible();
  }
  async submit(name: string) {
    await this.card(name)
      .getByRole("button", { name: "Submit application" })
      .click();
  }
  async status(name: string, status: string) {
    await expect(this.card(name).getByRole("status")).toHaveText(status);
  }
}
