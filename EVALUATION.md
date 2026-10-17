# Executed evaluation and verification

## Final clean verification

After source formatting and the final code edits, all **30 Chromium tests passed** with zero skips and zero retries in **13.82 seconds. TypeScript checking, ESLint, Prettier checks and the Vite build also passed.

## Question

Does cross-layer UI/API/database testing detect more loan-workflow defects than UI-only automation in this synthetic demo?

## Measured result

Approach A detected **5/8** seeded defects; B detected **8/8**. B found three additional faults: duplicate review, another applicant's record disclosure, and out-of-scope officer review. This is a **37.5 percentage-point recall difference on this eight-fault set**, not a general claim about production QA.

| Metric                            | A: UI-only | B: UI + API + SQL |
| --------------------------------- | ---------: | ----------------: |
| Scenarios per clean run           |         11 |                30 |
| Defects detected                  |      5 / 8 |             8 / 8 |
| Detection recall                  |      62.5% |              100% |
| Clean-baseline false positives    |          0 |                 0 |
| Clean Playwright duration         |    10.32 s |           13.05 s |
| Sum of eight mutant-run durations |   211.24 s |          294.31 s |

## Per-defect detection

| Seeded defect          | A        | B        |
| ---------------------- | -------- | -------- |
| ui-status              | Detected | Detected |
| invalid-ratio          | Detected | Detected |
| approval-not-persisted | Detected | Detected |
| duplicate-review       | Missed   | Detected |
| record-leak            | Missed   | Detected |
| response-field         | Detected | Detected |
| missing-document       | Detected | Detected |
| officer-scope          | Missed   | Detected |

## Method and definitions

- Eighteen executed cells: one clean baseline plus eight separate faults, each run with A and B. Only one fault is enabled at a time.
- Every cell resets the same synthetic schema/accounts and starts fresh API/Vite processes. Both use one worker, the same browser executable, hardware, PostgreSQL wire protocol and PGlite instance. No retries or skipped tests hide results.
- A is exactly tests/ui.spec.ts: browser interactions and user-visible assertions only. SQL cleanup is shared housekeeping, not an oracle in A.
- B is A plus tests/cross-layer.spec.ts: direct API authorization/contracts, SQL assertions, and two browser/API/SQL journeys.
- A defect is detected when at least one of its predeclared probe test IDs fails. Multiple failures from the same injected bug count once. Test assertions never import or branch on fault definitions.
- Recall = distinct detected faults / 8. False-positive count = failed test instances on the clean baseline. This is one baseline trial per approach, not a statistical false-positive-rate estimate.
- Duration is Playwright's reported wall duration, including its app startup/setup, excluding the separate migration/seed step. Failed UI waits make response-field runs particularly long. Raw per-cell durations, failed assertions, HTML reports, screenshots and traces are preserved under artifacts/runs/.

## Actual assertion examples

**duplicate-review — API10 duplicate review of APPROVED denied**

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: 409
Received: 200
```

**record-leak — API07 other applicant cannot read record**

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 200
```

**officer-scope — API08 out-of-scope officer cannot decide**

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 200
```

**approval-not-persisted — API11 approval response persists across GET and SQL**

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: "APPROVED"
Received: "SUBMITTED"
```

## Execution environment and boundaries

- Node.js 24.19.0; npm 11.9.0; Playwright Test 1.64.0. Exact dependencies and lockfile are included.
- Actual Chromium browser: **141.0.7390.37** (downloaded Chromium 141 headless shell, supplied explicitly through CHROMIUM_PATH). The latest bundled Chromium download returned invalid/blocked data, so it was not claimed as tested.
- Actual database: **PostgreSQL 18.3 (PGlite 0.5.8) on wasm32-unknown-emscripten, compiled by emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 3.1.74 (1092ec30a3fb1d46b1782ff1b4db5094d3d06ae5), 32-bit**. This is PostgreSQL compiled to WASM through PGlite 0.5.8 with pglite-socket 0.2.11, not the native Docker target.
- PostgreSQL 16.15 Docker Compose and Actions services are configured but were not executed: Docker is unavailable, and native initdb cannot use a non-root user inside this sandbox.
- The concurrent-review test passed in the portable adapter, but its query queue serializes operations. Real native PostgreSQL multi-session behavior remains unverified and should be checked by running the included clean CI or Docker suite.
- Firefox 157.0 installed, but **both smoke tests crashed before interacting with the app**. DEBUG logs report `Sandbox: writing /proc/self/uid_map: EPERM`; artifacts/firefox-diagnostic.log and JSON retain that evidence. Tests remain enabled and are not counted in the working Chromium study.
- Playwright Test Agent definitions were generated successfully. Actual MCP browser exploration failed with Unix socket `listen EPERM`. Optional integration is provided, but successful official planner/generator execution and human candidate approval remain unverified. Regular Playwright captured the demo screenshots.
- No GitHub repository was created or pushed and no hosted Actions run was executed. Workflow configuration is supplied; Windows/PowerShell instructions were reviewed, not run on Windows.

## Interpretation and limitations

B improved observed detection for these chosen faults, with a longer test run. It also has 19 additional scenarios, so this experiment combines greater coverage with additional test layers; it cannot isolate a causal effect of layers alone. The defects are intentionally chosen and known to the implementation author; there is no blinded sampling. There is one trial per cell, fixed A-then-B order, no confidence interval and no load/security/performance certification. Results must not be generalized beyond this fixture set.

Response-field faults cause schema failures and dependent UI waits, which count as detection when mapped to the relevant fixed probes. Clean baselines are required to distinguish those from general broken setup. The study used a minimal PDF-signature fixture because content parsing is out of scope; a valid one-page synthetic PDF is separately included for manual demonstration.

## Truthful resume bullets

- Built a synthetic mortgage QA framework with **30 Playwright scenarios** spanning UI, REST API contracts, authorization and SQL persistence; verified all 30 passing on Chromium against a PostgreSQL WASM test environment.
- Executed **18 clean/fault comparison runs** covering eight reversible defects; the expanded UI/API/SQL suite detected **8/8**, compared with **5/8** for UI-only tests, with zero failed tests on either clean baseline.

Use these measured claims as written. Do not claim native Docker, hosted CI success, production readiness or a completed human review of AI candidates.

## Evidence index

- [Measured JSON](artifacts/evaluation-results.json)
- [All run durations](artifacts/evaluation-table.md)
- [Clean Chromium report JSON](artifacts/standard-results.json)
- [Demo observations](artifacts/demo/observations.json)
- [Bug reproduction and trace links](BUG_REPORTS.md)
- [MCP execution limitation](artifacts/mcp-exploration.json)
