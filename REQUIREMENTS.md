# Human-specified acceptance criteria

Authoritative source: the user-supplied MASTER BUILD PROMPT — LoanFlow QA. These criteria preserve that requested scope. All policies below are fictional educational examples, not underwriting guidance.

- R01: Seeded applicant/officer accounts authenticate with backend-enforced roles. Wrong role/password and anonymous protected requests fail.
- R02: Applicants create their own DRAFT with name, positive income, positive loan amount, positive property value, and purpose.
- R03: A supporting PDF must be uploaded before submission. Upload is limited to 2 MB as a demo implementation choice; no document-content underwriting occurs.
- R04: Loan amount must be at most 80% of property value to submit. Exactly 80% is allowed; a cent above is denied.
- R05: A valid DRAFT can become SUBMITTED. Only submitted loans may be reviewed.
- R06: Applicants cannot review. Officers may access/review only their assigned scope. Applicants cannot read or mutate another applicant's application.
- R07: Officer decisions APPROVED or REJECTED require a recorded reason. Finalized applications cannot be reviewed again, even concurrently.
- R08: Applicant sees the persisted final status and decision reason.
- R09: API status codes and strict Zod JSON contracts are checked. Cross-layer tests compare UI/API/SQL and ensure failed operations do not mutate SQL.
- R10: AI planning is optional, uses local synthetic data, keeps candidate tests separate, and requires human review. Agents cannot change rules, weaken assertions, approve themselves, or edit the app to hide failures.
- R11: Eight reversible defects run separately from clean tests; measured recall, clean false positives, duration, and assertion examples are reported honestly.
- R12: Standard clean checks, reporting, trace evidence, Windows setup, lockfile, and CI workflows are included. Any execution limitations must be disclosed.

Implementation limits: amounts are positive demo numbers with at most two decimal places and a maximum of 1 billion. No currency conversion, affordability scoring, real accounts, bureau connections or money movement. Drafts cannot be edited after creation except for replacing their supporting document. Officers are assigned by NORTH/SOUTH scope, not underwriting expertise.
