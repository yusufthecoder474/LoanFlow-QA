# 🗺️ LoanFlow QA — Architecture & Visual Diagrams

[← Back to README](../README.md) · [Setup guide](SETUP_AND_TROUBLESHOOTING.md)

These diagrams are designed for GitHub's built-in **Mermaid** renderer, so they stay editable alongside the code. Colored blocks help distinguish users, application code, stored data and automated tests. The diagrams describe the local demonstration, **not** a live banking system.

## 1. 🔎 System architecture

```mermaid
flowchart TB
  subgraph PEOPLE["👥 People"]
    AP["🧑 Applicant"]
    OF["🧑‍⚖️ Loan officer"]
  end
  subgraph WEB["🌐 Browser"]
    UI["React + Vite<br/>Forms · lists · decisions"]
  end
  subgraph SERVER["⚙️ Application"]
    ROUTES["Express routes"]
    GUARDS["Session, role and scope checks"]
    VALID["Zod input validation"]
    ROUTES --> GUARDS --> VALID
  end
  DB[("🗃️ PostgreSQL<br/>users · sessions · loans")]
  subgraph AUTOMATION["🧪 Independent verification"]
    PW["Playwright page objects"]
    CONTRACT["HTTP / Zod assertions"]
    SQL["SQL persistence checks"]
  end
  AP --> UI
  OF --> UI
  UI -->|"HTTP /api; session cookie"| ROUTES
  VALID -->|"parameterized queries"| DB
  PW -. "drives" .-> UI
  CONTRACT -. "checks" .-> ROUTES
  SQL -. "checks" .-> DB
  classDef blue fill:#1d4ed8,color:#fff,stroke:#1e40af
  classDef violet fill:#6d28d9,color:#fff,stroke:#5b21b6
  classDef green fill:#047857,color:#fff,stroke:#065f46
  classDef amber fill:#b45309,color:#fff,stroke:#92400e
  class AP,OF,UI blue
  class ROUTES,GUARDS,VALID violet
  class DB green
  class PW,CONTRACT,SQL amber
```

**Explanation:** The UI is the visible part, but it does not decide permissions. The server checks accounts and scopes; the database holds the authoritative status. Playwright examines all three layers.

## 2. 👥 User actions and permission boundaries

```mermaid
flowchart TD
  LOGIN["🔐 Sign in"] --> ROLE{"Which role?"}
  ROLE -->|Applicant| A["Own loans only"]
  ROLE -->|Officer| O["Assigned scope only"]
  A --> D["Create draft"] --> PDF["Attach PDF"] --> SUB["Submit"]
  O --> Q["Review submitted loan"] --> WHY["Provide decision + reason"]
  SUB --> WAIT["Await officer decision"]
  WHY --> DONE["Finalized status"]
  DONE --> VIEW["Applicant views status"]
  classDef person fill:#1d4ed8,color:#fff
  classDef action fill:#dbeafe,color:#0f172a,stroke:#3b82f6
  classDef final fill:#047857,color:#fff
  class LOGIN,ROLE person
  class A,O,D,PDF,SUB,Q,WHY,WAIT action
  class DONE,VIEW final
```

**Privacy rule:** An applicant cannot read someone else's loan; a loan officer cannot access another scope. These are enforced in the API, not just hidden buttons.

## 3. 🔄 Application state machine

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> SUBMITTED: PDF present and requested amount <= 80% of property value
  SUBMITTED --> APPROVED: Assigned officer + valid reason
  SUBMITTED --> REJECTED: Assigned officer + valid reason
  APPROVED --> [*]
  REJECTED --> [*]
```

**Protection:** A finalized loan cannot be reviewed a second time in the clean implementation. Competing reviews use a conditional SQL update; one winner gets the decision, the other gets a conflict.

## 4. 🗃️ Actual database relationships (ERD)

```mermaid
erDiagram
  USERS ||--o{ SESSIONS : signs_in_with
  USERS ||--o{ LOANS : submits
  USERS {
    text id PK
    text name
    text role
    text scope
    text password_hash
  }
  SESSIONS {
    text token PK
    text user_id FK
    timestamptz expires_at
  }
  LOANS {
    uuid id PK
    text applicant_id FK
    text scope
    numeric monthly_income
    numeric requested_loan
    numeric property_value
    text purpose
    text status
    text document_name
    bytea document_bytes
    text reason
    timestamptz created_at
  }
```

Only **three tables** are created by `db/migrations/001_initial.sql`. `LOANS.scope` is used to decide which officer may see/review an application; it is not a separate officer foreign key. A loan stores the *document bytes* in PostgreSQL in this small local demo.

## 5. 🧩 Actual QA classes

```mermaid
classDiagram
  class LoginPage {
    +page: Page
    +login(id, role)
    +logout()
  }
  class ApplicationPage {
    +page: Page
    +card(name)
    +create(input)
    +upload(name)
    +submit(name)
    +status(name, status)
  }
  class ReviewPage {
    +decide(name, decision, reason)
  }
  class LoanApi {
    +request: APIRequestContext
    +login(id, role)
    +create(input)
    +upload(id)
    +submit(id)
    +submitted(input)
    +get(id)
    +review(id, decision, reason)
  }
  ReviewPage --|> ApplicationPage
```

The classes above are real TypeScript test helpers in `tests/pages/` and `tests/helpers/api.ts`. User, Loan and Session are database rows / TypeScript contracts, **not** OO domain classes; inventing classes for them would misrepresent the implementation.

## 6. 📨 One approval, inspected three ways (sequence)

```mermaid
sequenceDiagram
  autonumber
  actor A as Applicant
  actor O as Officer
  participant UI as React UI
  participant API as Express API
  participant DB as PostgreSQL
  participant T as Playwright QA
  A->>UI: Create draft and upload PDF
  UI->>API: POST /api/loans and /document
  API->>DB: INSERT / UPDATE loan
  A->>UI: Submit draft
  UI->>API: POST /api/loans/:id/submit
  API->>DB: Conditional status update
  O->>UI: Approve with reason
  UI->>API: POST /api/loans/:id/review
  API->>DB: Conditional UPDATE ... RETURNING
  DB-->>API: Saved decision
  API-->>UI: Approved result
  T->>UI: Assert status visible
  T->>API: GET same loan and verify contract
  T->>DB: SELECT persisted status and reason
  DB-->>T: Authoritative row
  Note over T,DB: This catches response-success-but-not-persisted faults
```

## 7. 🧪 Experiment: what each approach checks

```mermaid
flowchart LR
  BUGS["8 seeded defects<br/>+ clean baseline"] --> TWO{"Same fault,<br/>two approaches"}
  TWO --> A["A: UI-only<br/>11 scenarios"]
  TWO --> B["B: UI + API + SQL<br/>30 scenarios"]
  A --> AR["5 / 8 detected"]
  B --> BR["8 / 8 detected"]
  AR --> CONC["Compare against the<br/>known fault list"]
  BR --> CONC
  classDef origin fill:#334155,color:#fff
  classDef blue fill:#2563eb,color:#fff
  classDef green fill:#047857,color:#fff
  class BUGS,TWO origin
  class A,AR blue
  class B,BR,CONC green
```

**Limitations:** The 30-scenario version checks more cases *as well as* more layers. Tests were conducted on PGlite with one fixed ordering and one trial per experiment cell. Do not extrapolate these numbers to production defect-detection rates. For full methodology, see [EVALUATION.md](../EVALUATION.md).

## 8. ⚙️ CI configuration (planned verification path)

```mermaid
flowchart LR
  G["Git push / pull request"] --> CI["GitHub Actions workflow"]
  CI --> PG["PostgreSQL service"]
  PG --> DEP["npm ci + migrate + seed"]
  DEP --> CHECK["Types + lint + build"]
  CHECK --> CH["Chromium tests"]
  CH --> FF["Firefox smoke"]
  FF --> ART["Upload reports / evidence"]
  classDef start fill:#2563eb,color:#fff
  classDef job fill:#6d28d9,color:#fff
  classDef end fill:#047857,color:#fff
  class G start
  class CI,PG,DEP,CHECK,CH,FF job
  class ART end
```

The workflow is **configured**, not claimed as having passed on hosted GitHub runners. `experiment.yml` is manual and separate because deliberate defect injections must not be confused with normal green CI.
