# LoanFlow QA agent guardrails

Human acceptance criteria in REQUIREMENTS.md are authoritative. Never rewrite business rules to suit observed behavior.
Planner: explore only synthetic localhost data and propose missing scenarios in specs/. Generator: write candidate tests under agent-candidates/ only.
Never modify server/, client/, shared/, REQUIREMENTS.md, active tests or expected results to make failures pass. Never skip tests, add arbitrary sleeps, relax an assertion, or approve your own output.
No autonomous healer. Diagnose a failure and report evidence; a person must decide whether to fix the app or the test.
Every proposed assertion needs a requirement ID, expected result, observed locator, and reviewer status. Unreviewed candidates are excluded from the standard test suite.
Do not publish, merge, or send data externally. A human moves accepted candidates into tests/ after review.
