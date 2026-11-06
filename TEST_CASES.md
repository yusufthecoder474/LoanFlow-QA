# Scenario inventory

30 executable Chromium instances: 11 UI, 17 API/SQL, 2 cross-layer. Parameterized API03 and API10 generate separate test instances. Firefox repeats UI01/UI04.

| ID     | Criteria | Scenario                             | Expected result                                 |
| ------ | -------- | ------------------------------------ | ----------------------------------------------- |
| UI01   | R01      | Applicant login                      | Applicant dashboard and scope shown             |
| UI02   | R02      | Create valid draft                   | DRAFT card shown                                |
| UI03   | R03      | Upload supporting PDF                | Document filename shown; stays DRAFT            |
| UI04   | R03–R05  | Submit at exactly 80%                | SUBMITTED shown                                 |
| UI05   | R06–R08  | Officer approves; applicant revisits | APPROVED displayed by both roles                |
| UI06   | R07–R08  | Officer rejects with reason          | REJECTED and reason visible to applicant        |
| UI07   | R02      | Zero income                          | Validation error; no card                       |
| UI08   | R03      | Submit without PDF                   | Error; remains DRAFT                            |
| UI09   | R04      | Submit ratio a cent above boundary   | Error; remains DRAFT                            |
| UI10   | R06      | Applicant controls                   | No approval button                              |
| UI11   | R01      | Wrong role at login                  | Credential/role error                           |
| API01  | R01      | Anonymous GET                        | 401 and error schema                            |
| API02  | R02/R09  | Create via API                       | 201; strict loan schema and SQL match           |
| API03a | R02/R09  | Zero income                          | 400 and structured validation issues            |
| API03b | R02/R09  | Zero loan                            | 400 and structured validation issues            |
| API03c | R02/R09  | Zero property                        | 400 and structured validation issues            |
| API04  | R03/R09  | No PDF submission                    | 400; SQL unchanged                              |
| API05  | R04/R09  | Excessive ratio                      | 400; SQL unchanged                              |
| API06  | R06/R09  | Applicant posts decision             | 403; SQL unchanged                              |
| API07  | R06/R09  | Other applicant GET by ID            | 403; SQL unchanged                              |
| API08  | R06/R09  | Wrong-scope officer decision         | 403; SQL unchanged                              |
| API09  | R05      | Review DRAFT                         | 409; SQL remains DRAFT                          |
| API10a | R07/R09  | Review APPROVED twice                | 409; original status/reason retained            |
| API10b | R07/R09  | Review REJECTED again                | 409; original status/reason retained            |
| API11  | R07/R09  | Approval persisted                   | 200 APPROVED; GET and SQL agree                 |
| API12  | R03/R09  | Non-PDF bytes named .pdf             | 400; SQL unchanged                              |
| API13  | R09      | Response contract                    | Numeric income; strict JSON schema              |
| API14  | R07/R09  | Concurrent approve/reject            | Exactly one 200 and one 409; SQL matches winner |
| XL01   | R05/R09  | UI submission vs API/SQL             | All report SUBMITTED                            |
| XL02   | R07–R09  | UI approval vs API/SQL               | All report APPROVED and same reason             |

Fresh QA-prefixed data is created in each scenario. See tests/ui.spec.ts and tests/cross-layer.spec.ts for exact steps and HTTP/SQL assertions. tests/seed.spec.ts is an agent seed, explicitly excluded from standard test counting.

## Verified test execution results

**Environment:** GitHub Actions, Playwright, Chromium and Firefox  
**Verification date:** October 31, 2026  
**CI run:** https://github.com/yusufthecoder474/LoanFlow-QA/actions/runs/41198255419

| Test group | Result | Evidence |
|---|---|---|
| Original Chromium UI/API/SQL scenarios | 30 test instances included in regression suite | `TEST_CASES.md` and Playwright CI |
| Idempotency regression scenarios | 6 additional test cases | `tests/idempotency.spec.ts` |
| Full Chromium regression | 36 passed | GitHub Actions CI |
| Firefox smoke tests | 2 passed | GitHub Actions CI |
| TypeScript checks, lint and build | Passed | GitHub Actions CI |

### Defect investigation evidence

The controlled fault-injection experiment detected 8 of 8 intentionally seeded defects with combined UI, API and SQL checks, compared with 5 of 8 using UI-only checks.

Three investigated examples are documented as GitHub Issues:

- LF-001: https://github.com/yusufthecoder474/LoanFlow-QA/issues/2
- LF-002: https://github.com/yusufthecoder474/LoanFlow-QA/issues/3
- LF-003: https://github.com/yusufthecoder474/LoanFlow-QA/issues/4

These are intentionally injected educational defects, not unresolved production defects.

### Change verification

Pull Request #1 added retry-safe loan creation, database idempotency constraints and six automated regression scenarios.

Merged PR: https://github.com/yusufthecoder474/LoanFlow-QA/pull/1

The CI results above belong to the verified PR commit. They do not claim that each fault-injection experiment passed as an ordinary regression test.
