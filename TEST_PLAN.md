# LoanFlow QA test plan

## Goal and scope

Prove the synthetic applicant → submitted application → scoped officer decision workflow. The application exists to demonstrate QA, not mortgage underwriting. Cover browser actions, direct REST requests, strict response schemas, and persisted PostgreSQL records. No integrations or real customer data.

## Strategy

- Smoke: applicant login and exactly-80% document-backed submission (UI01/UI04), Chromium first and then Firefox.
- UI regression: 11 scenarios, created entirely through browser actions. UI assertions inspect user-visible outcomes only.
- API/SQL regression: 17 parameterized test instances, including positive fields, 400/401/403/409 errors, schema checks, data isolation and concurrent decisions.
- Cross-layer browser/API/SQL: 2 scenarios verifying submission and final decision across all three representations.
- Fault comparison: reuse the same UI suite as A; augment it with API/SQL/cross-layer checks for B. Run all eight defects independently and reset data before each cell.

## Isolation and environment

Four synthetic accounts are seeded. Factories generate QA-prefixed names with unique IDs. An automatic fixture removes only QA-prefixed records before/after each test; this SQL housekeeping is not a UI-only assertion. Tests use a dedicated demo DB, fresh browser/request contexts and one worker for predictable college-level debugging. Cookie authentication is per context; no real credentials are required.

Standard tests never read defect IDs or adapt expected outcomes to a fault. experiments/defects.json is consumed only by the comparison/report driver. API business rules use REQUIREMENTS.md as the oracle. Zod schemas assert contract shape and types, while explicit status and SQL assertions assert business behavior independently.

## Execution and evidence

`npm test`, `npm run test:smoke`, `npm run test:firefox`, and `npm run evaluate`.
Playwright starts API/Vite automatically and waits for HTTP readiness; no arbitrary sleeps exist in test scenarios. Page objects use role/label locators and web-first assertions. HTML and JSON reports are generated; failed browser tests retain screenshots and traces.

## Exit criteria

Typecheck, lint and frontend build pass; all 30 Chromium cases pass; clean Firefox smoke passes if available; B detects each of eight known faults; baseline has no failed tests. CI/Docker/MCP claims must be distinguished from local fallback observations.

## Exclusions and next work

No performance/load certification, production hardening, accessibility audit, PDF content/malware analysis or real underwriting. Additional agent suggestions remain proposals pending human review. A small seeded study is not evidence about all mortgage systems.
