import { test as base, expect } from "@playwright/test";
import { LoanApi } from "./helpers/api";
import { cleanup } from "./helpers/db";
import { db } from "../server/db";
import { LoginPage } from "./pages/LoginPage";
import { ApplicationPage } from "./pages/ApplicationPage";
import { ReviewPage } from "./pages/ReviewPage";
type Fixtures = {
  api: LoanApi;
  login: LoginPage;
  application: ApplicationPage;
  review: ReviewPage;
  isolation: void;
};
export const test = base.extend<Fixtures, { databaseLifecycle: void }>({
  databaseLifecycle: [
    async ({ playwright: _playwright }, use) => {
      await use();
      await db.end();
    },
    { scope: "worker", auto: true },
  ],
  api: async ({ request }, use) => {
    await use(new LoanApi(request));
  },
  login: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  application: async ({ page }, use) => {
    await use(new ApplicationPage(page));
  },
  review: async ({ page }, use) => {
    await use(new ReviewPage(page));
  },
  // SQL is used only to isolate synthetic test data; UI-only tests never assert against SQL.
  isolation: [
    async ({ request: _request }, use) => {
      await cleanup();
      await use();
      await cleanup();
    },
    { auto: true },
  ],
});
export { expect };
