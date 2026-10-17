# 🛠️ Setup & Troubleshooting — LoanFlow QA

[← Main README](../README.md) · [Architecture diagrams](DIAGRAMS.md)

The goal of this guide is to help another person run the project without already knowing its internals. This is a **local-only, synthetic demo**.

## ✅ Before you start

| Requirement | Why it matters | Check |
|---|---|---|
| Node.js 24 + npm | Runs the TypeScript application and Playwright scripts | `node --version` / `npm --version` |
| Docker Desktop (Linux containers) | Runs the intended PostgreSQL 16.15 container | `docker version` |
| Ports 5432, 3001, 5173 | DB, API and web app | See command below |
| Playwright Chromium | Required for automated browser tests | `npx playwright install chromium` |

**Windows PowerShell** commands are shown. For macOS/Linux, use `cp .env.example .env` instead of `Copy-Item`.

## 🚀 First-time setup

```powershell
# In the extracted LoanFlow-QA folder
node --version
npm --version
Copy-Item .env.example .env
npm ci
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npx playwright install chromium
npm run dev
```

Open `http://127.0.0.1:5173`. Test `alice` (Applicant) and `officer-north` (Loan Officer), each with the synthetic password `Demo123!`.

> [!WARNING]
> Never use actual borrower data. `npm run db:seed` wipes the **users, sessions and loans** tables in the configured database. Double-check `DATABASE_URL` before running it.

## 🧪 Running the tests safely

1. Stop the manually started `npm run dev` session with **Ctrl+C**.
2. Keep the PostgreSQL container running.
3. Run:

```powershell
npm run typecheck
npm run lint
npm run build
npm test
npm run report
```

Playwright starts its own API/Vite processes unless `EXTERNAL_SERVER` is set. The default result files are under `artifacts/standard-results.json`, `playwright-report/`, and `test-results/` (some are generated only after testing).

## 🔎 Common problems

### "Cannot connect to PostgreSQL"

```powershell
docker compose ps
docker compose logs postgres
```

Ensure Docker Desktop is running and no other PostgreSQL instance owns port **5432**. Confirm `.env` points to `127.0.0.1:5432/loanflow` and uses the matching local demonstration credentials.

### "Port 3001 / 5173 already in use"

Close earlier development terminals or browser test processes before retrying. On Windows, to inspect a listening port:

```powershell
Get-NetTCPConnection -LocalPort 3001,5173 -State Listen -ErrorAction SilentlyContinue
```

Stop the owning process only if you recognize it; do not kill unrelated services.

### "Playwright browser executable missing"

```powershell
npx playwright install chromium
```

If your network blocks browser downloads, the project accepts a `CHROMIUM_PATH` override to an *installed compatible browser*, but browser-version differences may affect the outcome.

### "Tests fail because old data is present"

On the dedicated synthetic database only:

```powershell
npm run db:seed
npm test
```

### "Docker unavailable on my machine"

Run the PGlite fallback instead (requires free port **5432**):

```powershell
npm run verify:portable
```

PGlite is a functional verification path, **not** evidence of native PostgreSQL concurrency. It starts a temporary PostgreSQL-compatible WASM instance, performs migration/seed, executes tests, then shuts down.

### "Firefox tests crash, even though Chromium passes"

Firefox failed in the original restricted sandbox before app interaction due to a process sandbox permission error. This is an environment limitation. Run Chromium, keep any Firefox failure logs, and do not call the Firefox suite passing without a successful local run.

### "Why does the 8-defect experiment contain failures?"

That is intentional. `npm run evaluate` injects one controlled fault at a time and checks whether assertions detect it. Use [BUG_REPORTS.md](../BUG_REPORTS.md) and [EVALUATION.md](../EVALUATION.md) to distinguish seeded defects from bugs in the clean application.

## 🔒 Before uploading to GitHub

- Upload **`.env.example`**, **not `.env`**.
- Do not commit `node_modules/`, `playwright-report/`, `test-results/`, or generated trace archives.
- Keep `README.md`, `LICENSE`, `.github/workflows/`, `client/`, `server/`, `shared/`, `db/`, `tests/`, `scripts/` and important evaluation evidence.
- Verify the repository files after uploading: GitHub's browser upload can omit deeply nested or hidden directories depending on how the files are selected.
- Treat the synthetic demo password as public by design. Never reuse it on any service.

## 🧹 Stop and clean up

```powershell
# Stop the container but preserve the demo data volume
docker compose down
```

`docker compose down -v` **deletes the named database volume**. Use it only if you intentionally want to discard the entire local synthetic database.

## 📚 Useful references

- [Project README](../README.md) — what it does, screenshots, setup and results
- [Diagrams](DIAGRAMS.md) — users, architecture, QA classes and data model
- [Evaluation](../EVALUATION.md) — measured outcome and exact limitations
- [Architecture](../ARCHITECTURE.md) — route and validation design decisions
- [Test plan](../TEST_PLAN.md) — planned and implemented verification cases
