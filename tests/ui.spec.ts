import { test, expect } from "./fixtures";
import { data } from "./helpers/data";
test("UI01 @smoke applicant login", async ({ login, page }) => {
  await login.login();
  await expect(page.getByText(/NORTH WORKSPACE/)).toBeVisible();
});
test("UI02 draft creation", async ({ login, application }) => {
  await login.login();
  const d = data();
  await application.create(d);
  await application.status(d.applicantName, "DRAFT");
});
test("UI03 PDF upload", async ({ login, application }) => {
  await login.login();
  const d = data();
  await application.create(d);
  await application.upload(d.applicantName);
  await application.status(d.applicantName, "DRAFT");
});
test("UI04 @smoke submit at exactly 80 percent", async ({
  login,
  application,
}) => {
  await login.login();
  const d = data();
  await application.create(d);
  await application.upload(d.applicantName);
  await application.submit(d.applicantName);
  await application.status(d.applicantName, "SUBMITTED");
});
test("UI05 officer approves; applicant sees final status", async ({
  login,
  application,
  review,
}) => {
  await login.login();
  const d = data();
  await application.create(d);
  await application.upload(d.applicantName);
  await application.submit(d.applicantName);
  await application.status(d.applicantName, "SUBMITTED");
  await login.logout();
  await login.login("officer-north", "OFFICER");
  await review.decide(d.applicantName, "APPROVED", "Documents reviewed");
  await review.status(d.applicantName, "APPROVED");
  await login.logout();
  await login.login();
  await application.status(d.applicantName, "APPROVED");
});
test("UI06 officer rejects and reason is displayed", async ({
  login,
  application,
  review,
  page,
}) => {
  await login.login();
  const d = data();
  await application.create(d);
  await application.upload(d.applicantName);
  await application.submit(d.applicantName);
  await application.status(d.applicantName, "SUBMITTED");
  await login.logout();
  await login.login("officer-north", "OFFICER");
  await review.decide(
    d.applicantName,
    "REJECTED",
    "Incomplete supporting evidence",
  );
  await review.status(d.applicantName, "REJECTED");
  await login.logout();
  await login.login();
  await application.status(d.applicantName, "REJECTED");
  await expect(
    page.getByText("Decision reason: Incomplete supporting evidence"),
  ).toBeVisible();
});
test("UI07 invalid income rejected", async ({ login, application, page }) => {
  await login.login();
  const d = data({ monthlyIncome: 0 });
  await application.create(d);
  await expect(page.getByRole("alert")).toHaveText("Validation failed");
  await expect(application.card(d.applicantName)).toHaveCount(0);
});
test("UI08 missing document rejected", async ({ login, application, page }) => {
  await login.login();
  const d = data();
  await application.create(d);
  await application.status(d.applicantName, "DRAFT");
  await application.submit(d.applicantName);
  await expect(page.getByRole("alert")).toHaveText(
    "A supporting PDF is required",
  );
  await application.status(d.applicantName, "DRAFT");
});
test("UI09 one cent above 80 percent rejected", async ({
  login,
  application,
  page,
}) => {
  await login.login();
  const d = data({ requestedLoan: 160000.01 });
  await application.create(d);
  await application.upload(d.applicantName);
  await application.submit(d.applicantName);
  await expect(page.getByRole("alert")).toHaveText(
    "Loan cannot exceed 80% of property value",
  );
  await application.status(d.applicantName, "DRAFT");
});
test("UI10 applicant has no review controls", async ({ login, page }) => {
  await login.login();
  await expect(
    page.getByRole("button", { name: "Approve application" }),
  ).toHaveCount(0);
});
test("UI11 wrong role login denied", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Role", exact: true })
    .selectOption("OFFICER");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Invalid credentials or role",
  );
});
