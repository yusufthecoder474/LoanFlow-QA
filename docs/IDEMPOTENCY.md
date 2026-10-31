# Retry-safe loan creation

The synthetic applicant endpoint `POST /api/loans` accepts an optional HTTP
`Idempotency-Key` header containing 8–128 ASCII letters, digits, underscores
or hyphens. Clients without the header behave exactly as before.

For a given authenticated applicant, the first valid request returns HTTP 201
and stores an SHA-256 digest of the schema-normalized loan payload alongside
the new loan. Repeating the same key and payload returns the same loan (HTTP
201 plus `Idempotent-Replayed: true`). Reusing the key with different valid
loan data returns HTTP 409. Applicants have separate key namespaces.

Concurrent retries are serialized by a **PostgreSQL partial unique index**
on `(applicant_id, idempotency_key)`, which lets the API avoid creating duplicate
drafts even when requests race. The index and nullable columns are introduced
by `db/migrations/002_idempotency.sql`. The migration uses repeatable DDL and
does not rewrite existing loan records.

## Verify

Run only against the repository's disposable synthetic database:

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run typecheck
npm run lint
npm run test -- --grep IDEMP
```

`tests/idempotency.spec.ts` covers sequential retries, five parallel retries,
payload conflicts, independent applicant namespaces, invalid keys and the
original no-key behavior. CI also runs the entire pre-existing Playwright suite.

## Scope and limitations

This portfolio implementation only protects **draft creation**. It is not a
payments engine, does not deduplicate arbitrary endpoints, and is not a
production-grade Stripe idempotency implementation. Keys have no TTL yet;
there is no per-tenant retention policy, tracing, rate limiting by key, or
payment-provider integration. Payload fingerprints are computed after strict
Zod input validation. HTTP status 201 remains stable across successful retries.
