import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures";
import { data } from "./helpers/data";
import { db } from "../server/db";
import { loanSchema } from "../shared/contracts";

test("IDEMP01 retry with same key and payload returns original record", async ({
  api,
  request,
}) => {
  await api.login();
  const input = data();
  const key = "retry-" + randomUUID();
  const first = await request.post("/api/loans", {
    headers: { "Idempotency-Key": key },
    data: input,
  });
  const second = await request.post("/api/loans", {
    headers: { "Idempotency-Key": key },
    data: input,
  });
  expect([first.status(), second.status()]).toEqual([201, 201]);
  expect(second.headers()["idempotent-replayed"]).toBe("true");
  const original = loanSchema.parse(await first.json());
  const replayed = loanSchema.parse(await second.json());
  expect(replayed).toEqual(original);
  const rows = await db.query(
    "SELECT count(*)::int AS count FROM loans WHERE applicant_id=$1 AND idempotency_key=$2",
    ["alice", key],
  );
  expect(rows.rows[0].count).toBe(1);
});

test("IDEMP02 simultaneous retries create exactly one loan", async ({
  api,
  request,
}) => {
  await api.login();
  const input = data();
  const key = "parallel-" + randomUUID();
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      request.post("/api/loans", {
        headers: { "Idempotency-Key": key },
        data: input,
      }),
    ),
  );
  expect(results.map((r) => r.status())).toEqual([201, 201, 201, 201, 201]);
  const loans = await Promise.all(
    results.map(async (r) => loanSchema.parse(await r.json())),
  );
  expect(new Set(loans.map((l) => l.id)).size).toBe(1);
  const rows = await db.query(
    "SELECT count(*)::int AS count FROM loans WHERE applicant_id=$1 AND idempotency_key=$2",
    ["alice", key],
  );
  expect(rows.rows[0].count).toBe(1);
});

test("IDEMP03 changed payload for a reused key is rejected", async ({
  api,
  request,
}) => {
  await api.login();
  const input = data();
  const key = "changed-" + randomUUID();
  const first = await request.post("/api/loans", {
    headers: { "Idempotency-Key": key },
    data: input,
  });
  expect(first.status()).toBe(201);
  const original = loanSchema.parse(await first.json());
  const second = await request.post("/api/loans", {
    headers: { "Idempotency-Key": key },
    data: { ...input, purpose: input.purpose + " updated" },
  });
  expect(second.status()).toBe(409);
  expect((await api.get(original.id)).id).toBe(original.id);
  const rows = await db.query(
    "SELECT count(*)::int AS count FROM loans WHERE applicant_id=$1 AND idempotency_key=$2",
    ["alice", key],
  );
  expect(rows.rows[0].count).toBe(1);
});

test("IDEMP04 the same key belongs to each applicant separately", async ({
  api,
  request,
}) => {
  const input = data();
  const key = "tenant-" + randomUUID();
  await api.login("alice");
  const alice = await request.post("/api/loans", {
    headers: { "Idempotency-Key": key },
    data: input,
  });
  expect(alice.status()).toBe(201);
  await api.login("bob");
  const bob = await request.post("/api/loans", {
    headers: { "Idempotency-Key": key },
    data: input,
  });
  expect(bob.status()).toBe(201);
  expect((await alice.json()).id).not.toBe((await bob.json()).id);
  const rows = await db.query(
    "SELECT count(*)::int AS count FROM loans WHERE idempotency_key=$1",
    [key],
  );
  expect(rows.rows[0].count).toBe(2);
});

test("IDEMP05 malformed keys fail without creating loans", async ({
  api,
  request,
}) => {
  await api.login();
  const input = data();
  for (const key of ["short", "has space", "a".repeat(129)]) {
    const response = await request.post("/api/loans", {
      headers: { "Idempotency-Key": key },
      data: input,
    });
    expect(response.status()).toBe(400);
  }
  const rows = await db.query(
    "SELECT count(*)::int AS count FROM loans WHERE applicant_name=$1",
    [input.applicantName],
  );
  expect(rows.rows[0].count).toBe(0);
});

test("IDEMP06 legacy creation without a key remains non-idempotent", async ({
  api,
  request,
}) => {
  await api.login();
  const input = data();
  const first = await request.post("/api/loans", { data: input });
  const second = await request.post("/api/loans", { data: input });
  expect(first.status()).toBe(201);
  expect(second.status()).toBe(201);
  expect((await first.json()).id).not.toBe((await second.json()).id);
});
