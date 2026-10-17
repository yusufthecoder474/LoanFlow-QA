# Bug reports from the executed seeded-defect experiment

These are deliberate educational mutants, not unresolved defects claimed in the clean application. Revert each by unsetting FAULT/ENABLE_FAULTS and restarting the API; no source editing is required. Tests never change their expected behavior to match a fault.

## LF-001 — Finalized application accepts a second decision

- Severity: High within this demo (decision integrity).
- Fault: `duplicate-review`; requirement R07.
- Environment: local Playwright 1.64.0, Chromium 141, PostgreSQL 18.3 via PGlite fallback.
- Preconditions: a dedicated synthetic database, Alice applicant, North Officer, valid PDF-backed application.
- Reproduction: create a draft as Alice; upload PDF; submit; sign in as North Officer; approve with a reason; POST another APPROVED review with a different reason to the same ID.
- Expected: second POST returns HTTP 409; original SQL status/reason remain unchanged.
- Actual: second POST returned HTTP 200. The API10 assertion failed (`Expected: 409`, `Received: 200`). The fault also accepts a new approval after a rejection.
- Evidence: [executed run JSON](artifacts/runs/duplicate-review-B/results.json), [trace](artifacts/runs/duplicate-review-B/test-results/cross-layer-API10-duplicate-review-of-APPROVED-denied-chromium/trace.zip), [assertion context](artifacts/runs/duplicate-review-B/test-results/cross-layer-API10-duplicate-review-of-APPROVED-denied-chromium/error-context.md).
- Isolation: UI-only A passed all 11 scenarios for this mutant; B failed the two duplicate tests and concurrent-decision test.
- Clean implementation: conditional SQL UPDATE restricted to SUBMITTED plus HTTP 409 for an already-final record.

Reproduce in PowerShell (keep PostgreSQL running and close manual app servers):

```powershell
$env:ENABLE_FAULTS = "true"
$env:FAULT = "duplicate-review"
npm run db:seed
npx playwright test tests/cross-layer.spec.ts --project=chromium --grep API10
Remove-Item Env:FAULT
Remove-Item Env:ENABLE_FAULTS
```

Seeded tests intentionally fail; this is separate from clean CI. Use `npm run evaluate` to capture both approaches automatically.

## LF-002 — Success response does not persist approval

- Severity: High within the demo (false decision confirmation).
- Fault: `approval-not-persisted`; requirements R07–R09.
- Steps: create/upload/submit; approve as assigned officer; compare returned status, fresh GET and parameterized SQL SELECT.
- Expected: response, subsequent GET and SQL all report APPROVED with the recorded reason.
- Actual: response reports APPROVED, while SQL retains SUBMITTED. API11's reusable persistence assertion detects this; UI05 also catches it when the applicant signs back in.
- Evidence: [executed run JSON](artifacts/runs/approval-not-persisted-B/results.json); retained trace paths are in its attachments and HTML report.
- Clean implementation: the response is serialized from the UPDATE ... RETURNING row.

## LF-003 — Approved application displays the wrong UI badge

- Severity: Medium within the demo (misleading applicant status).
- Fault: `ui-status`; requirements R08–R09.
- Steps: submit a valid application; approve as North Officer; inspect the officer/applicant card.
- Expected: exact text APPROVED.
- Actual: badge text SUBMITTED for an approved record; UI05 and XL02 fail the exact status assertion.
- Evidence: [executed run JSON](artifacts/runs/ui-status-B/results.json), [cross-layer trace](artifacts/runs/ui-status-B/test-results/cross-layer-XL02-UI-decision-agrees-with-API-and-SQL-chromium/trace.zip), [screenshot](artifacts/runs/ui-status-B/test-results/cross-layer-XL02-UI-decision-agrees-with-API-and-SQL-chromium/test-failed-1.png).
- Clean implementation: badge text renders the persisted API status.

## Environment issues, distinct from app defects

Firefox page creation crashed before a workflow ran; diagnostic logs report `Sandbox: writing /proc/self/uid_map: EPERM`. Playwright MCP browser startup was blocked by Unix socket binding EPERM. These are not counted as defect-study false positives, because that study uses the same working Chromium environment for both approaches. Native Docker/hosted Actions and human approval of optional AI candidates remain unverified.
