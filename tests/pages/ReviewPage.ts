import { type Page } from "@playwright/test";
import { ApplicationPage } from "./ApplicationPage";
export class ReviewPage extends ApplicationPage {
  constructor(page: Page) {
    super(page);
  }
  async decide(
    name: string,
    decision: "APPROVED" | "REJECTED",
    reason: string,
  ) {
    const c = this.card(name);
    await c.getByLabel("Decision reason").fill(reason);
    await c
      .getByRole("button", {
        name:
          decision === "APPROVED"
            ? "Approve application"
            : "Reject application",
      })
      .click();
  }
}
