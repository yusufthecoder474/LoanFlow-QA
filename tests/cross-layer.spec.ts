import { test, expect } from "./fixtures";
import { LoanApi } from "./helpers/api";
import { data, pdf } from "./helpers/data";
import { errorSchema, loanSchema } from "../shared/contracts";
import { record } from "./helpers/db";
import { persisted } from "./helpers/assertions";
test("API01 anonymous request returns 401", async ({ request }) => {
  const r = await request.get("/api/loans");
  expect(r.status()).toBe(401);
  expect(errorSchema.parse(await r.json()).error).toBe(
    "Authentication required",
  );
});
test("API02 creation returns 201 and strict schema matches SQL", async ({
  api,
}) => {
  await api.login();
  await persisted(await api.create());
});
for (const field of [
  "monthlyIncome",
  "requestedLoan",
  "propertyValue",
] as const)
  test(`API03 ${field} zero rejected with structured validation`, async ({
    api,
    request,
  }) => {
    await api.login();
    const r = await request.post("/api/loans", { data: data({ [field]: 0 }) });
    expect(r.status()).toBe(400);
    expect(errorSchema.parse(await r.json()).issues?.length).toBeGreaterThan(0);
  });
test("API04 missing document leaves SQL unchanged", async ({ api }) => {
  await api.login();
  const l = await api.create();
  const before = await record(l.id);
  const r = await api.submit(l.id);
  expect(r.status()).toBe(400);
  expect(await record(l.id)).toEqual(before);
});
test("API05 ratio exceeded leaves SQL unchanged", async ({ api }) => {
  await api.login();
  const l = await api.create(data({ requestedLoan: 160000.01 }));
  await api.upload(l.id);
  const before = await record(l.id);
  expect((await api.submit(l.id)).status()).toBe(400);
  expect(await record(l.id)).toEqual(before);
});
test("API06 applicant review forbidden and SQL unchanged", async ({ api }) => {
  await api.login();
  const l = await api.submitted();
  const before = await record(l.id);
  expect((await api.review(l.id)).status()).toBe(403);
  expect(await record(l.id)).toEqual(before);
});
test("API07 other applicant cannot read record", async ({ api, request }) => {
  await api.login();
  const l = await api.create();
  await api.login("bob");
  const before = await record(l.id);
  expect((await request.get(`/api/loans/${l.id}`)).status()).toBe(403);
  expect(await record(l.id)).toEqual(before);
});
test("API08 out-of-scope officer cannot decide", async ({ api }) => {
  await api.login("bob");
  const l = await api.submitted();
  const before = await record(l.id);
  await api.login("officer-north", "OFFICER");
  expect((await api.review(l.id)).status()).toBe(403);
  expect(await record(l.id)).toEqual(before);
});
test("API09 draft cannot be reviewed", async ({ api }) => {
  await api.login();
  const l = await api.create();
  await api.login("officer-north", "OFFICER");
  expect((await api.review(l.id)).status()).toBe(409);
  expect((await record(l.id)).status).toBe("DRAFT");
});
for (const decision of ["APPROVED", "REJECTED"])
  test(`API10 duplicate review of ${decision} denied`, async ({ api }) => {
    await api.login();
    const l = await api.submitted();
    await api.login("officer-north", "OFFICER");
    const r = await api.review(l.id, decision);
    expect(r.status()).toBe(200);
    await persisted(loanSchema.parse(await r.json()));
    const before = await record(l.id);
    expect(
      (await api.review(l.id, "APPROVED", "Second attempt")).status(),
    ).toBe(409);
    expect(await record(l.id)).toEqual(before);
  });
test("API11 approval response persists across GET and SQL", async ({ api }) => {
  await api.login();
  const l = await api.submitted();
  await api.login("officer-north", "OFFICER");
  const r = await api.review(l.id);
  expect(r.status()).toBe(200);
  const result = loanSchema.parse(await r.json());
  expect(result.status).toBe("APPROVED");
  await persisted(result);
  expect((await api.get(l.id)).status).toBe("APPROVED");
});
test("API12 spoofed PDF rejected; SQL unchanged", async ({ api, request }) => {
  await api.login();
  const l = await api.create();
  const before = await record(l.id);
  const r = await request.post(`/api/loans/${l.id}/document`, {
    multipart: { document: { ...pdf, buffer: Buffer.from("not a PDF") } },
  });
  expect(r.status()).toBe(400);
  expect(await record(l.id)).toEqual(before);
});
test("API13 response schema includes numeric income", async ({
  api,
  request,
}) => {
  await api.login();
  const l = await api.create();
  const r = await request.get(`/api/loans/${l.id}`);
  expect(r.status()).toBe(200);
  expect(loanSchema.safeParse(await r.json()).success).toBe(true);
});
test("API14 simultaneous decisions have exactly one winner", async ({
  api,
  request,
}) => {
  await api.login();
  const l = await api.submitted();
  await api.login("officer-north", "OFFICER");
  const results = await Promise.all([
    request.post(`/api/loans/${l.id}/review`, {
      data: { decision: "APPROVED", reason: "Review A" },
    }),
    request.post(`/api/loans/${l.id}/review`, {
      data: { decision: "REJECTED", reason: "Review B" },
    }),
  ]);
  expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
  const winner = loanSchema.parse(
    await results.find((r) => r.status() === 200)!.json(),
  );
  await persisted(winner);
});
test("XL01 UI submission agrees with API and SQL", async ({
  login,
  application,
  page,
}) => {
  await login.login();
  const d = data();
  await application.create(d);
  await application.upload(d.applicantName);
  await application.submit(d.applicantName);
  await application.status(d.applicantName, "SUBMITTED");
  const api = new LoanApi(page.request);
  const r = await page.request.get("/api/loans");
  expect(r.status()).toBe(200);
  const loan = loanSchema.parse(
    (await r.json()).find(
      (x: { applicantName: string }) => x.applicantName === d.applicantName,
    ),
  );
  expect(loan.status).toBe("SUBMITTED");
  await persisted(await api.get(loan.id));
});
test("XL02 UI decision agrees with API and SQL", async ({
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
  await review.decide(d.applicantName, "APPROVED", "Cross-layer review");
  await review.status(d.applicantName, "APPROVED");
  const r = await page.request.get("/api/loans");
  expect(r.status()).toBe(200);
  const loan = loanSchema.parse(
    (await r.json()).find(
      (x: { applicantName: string }) => x.applicantName === d.applicantName,
    ),
  );
  expect(loan.status).toBe("APPROVED");
  await persisted(loan);
});
