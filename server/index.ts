import "dotenv/config";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import multer from "multer";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { matches } from "./password";
import { fault } from "./faults";
import {
  inputSchema,
  reviewSchema,
  type User,
  type Loan,
} from "../shared/contracts";
const app = express();
app.use(express.json({ limit: "20kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  next();
});
type AuthRequest = Request & { user?: User };
type Row = {
  id: string;
  applicant_id: string;
  scope: string;
  applicant_name: string;
  monthly_income: string;
  requested_loan: string;
  property_value: string;
  purpose: string;
  status: Loan["status"];
  document_name: string | null;
  reason: string | null;
};
const toLoan = (r: Row) => ({
  id: r.id,
  applicantId: r.applicant_id,
  scope: r.scope,
  applicantName: r.applicant_name,
  monthlyIncome: fault("response-field")
    ? String(r.monthly_income)
    : Number(r.monthly_income),
  requestedLoan: Number(r.requested_loan),
  propertyValue: Number(r.property_value),
  purpose: r.purpose,
  status: r.status,
  documentName: r.document_name,
  reason: r.reason,
});
const fail = (res: Response, code: number, error: string) =>
  res.status(code).json({ error });
app.get("/api/health", async (_req, res) => {
  await db.query("SELECT 1");
  res.json({ ok: true });
});
app.post("/api/login", async (req, res) => {
  const parsed = z
    .object({
      id: z.string(),
      password: z.string().max(128),
      role: z.enum(["APPLICANT", "OFFICER"]),
    })
    .strict()
    .safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Invalid login input");
  const { id, password, role } = parsed.data;
  const result = await db.query("SELECT * FROM users WHERE id=$1", [id]);
  const u = result.rows[0];
  if (!u || u.role !== role || !matches(password, id, u.password_hash))
    return fail(res, 401, "Invalid credentials or role");
  const token = randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO sessions VALUES ($1,$2,now()+interval '4 hours')",
    [token, id],
  );
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 4 * 60 * 60 * 1000,
    path: "/",
  });
  res.json({ id: u.id, name: u.name, role: u.role, scope: u.scope });
});
app.use("/api", async (req: AuthRequest, res, next) => {
  const token = req.headers.cookie
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("session="))
    ?.slice(8);
  if (!token) return fail(res, 401, "Authentication required");
  const r = await db.query(
    "SELECT u.id,u.name,u.role,u.scope FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>now()",
    [token],
  );
  if (!r.rows[0]) return fail(res, 401, "Session expired");
  req.user = r.rows[0];
  next();
});
app.get("/api/me", (req: AuthRequest, res) => res.json(req.user));
app.post("/api/logout", async (req, res) => {
  const token = req.headers.cookie
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("session="))
    ?.slice(8);
  await db.query("DELETE FROM sessions WHERE token=$1", [token]);
  res.clearCookie("session");
  res.json({ ok: true });
});
app.get("/api/config", (_req, res) =>
  res.json({ wrongUiStatus: fault("ui-status") }),
);
app.get("/api/loans", async (req: AuthRequest, res) => {
  const u = req.user!;
  const r =
    u.role === "APPLICANT"
      ? await db.query(
          "SELECT * FROM loans WHERE applicant_id=$1 ORDER BY created_at DESC",
          [u.id],
        )
      : await db.query(
          "SELECT * FROM loans WHERE scope=$1 ORDER BY created_at DESC",
          [u.scope],
        );
  res.json(r.rows.map(toLoan));
});
app.post("/api/loans", async (req: AuthRequest, res) => {
  const u = req.user!;
  if (u.role !== "APPLICANT") return fail(res, 403, "Applicants only");
  const p = inputSchema.safeParse(req.body);
  if (!p.success)
    return res
      .status(400)
      .json({ error: "Validation failed", issues: p.error.issues });
  const d = p.data;
  // Optional client-supplied retry key. Existing clients can omit it.
  const key = req.get("Idempotency-Key");
  if (key !== undefined && !/^[A-Za-z0-9_-]{8,128}$/.test(key))
    return fail(res, 400, "Invalid Idempotency-Key");
  const payloadHash = key
    ? createHash("sha256").update(JSON.stringify(d)).digest("hex")
    : null;
  const id = randomUUID();
  const values = [
    id,
    u.id,
    u.scope,
    d.applicantName,
    d.monthlyIncome,
    d.requestedLoan,
    d.propertyValue,
    d.purpose,
  ];
  if (!key) {
    const r = await db.query(
      "INSERT INTO loans (id,applicant_id,scope,applicant_name,monthly_income,requested_loan,property_value,purpose) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      values,
    );
    return res.status(201).json(toLoan(r.rows[0]));
  }
  // The partial unique index serializes same-applicant, same-key races.
  // A conflicting insert blocks until the winner commits, then returns no row.
  const created = await db.query(
    "INSERT INTO loans (id,applicant_id,scope,applicant_name,monthly_income,requested_loan,property_value,purpose,idempotency_key,idempotency_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (applicant_id,idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING *",
    [...values, key, payloadHash],
  );
  if (created.rows[0]) return res.status(201).json(toLoan(created.rows[0]));
  const previous = await db.query(
    "SELECT * FROM loans WHERE applicant_id=$1 AND idempotency_key=$2",
    [u.id, key],
  );
  if (!previous.rows[0]) return fail(res, 503, "Retry the request");
  if (previous.rows[0].idempotency_hash !== payloadHash)
    return fail(res, 409, "Idempotency key reused with different loan data");
  res.setHeader("Idempotent-Replayed", "true");
  return res.status(201).json(toLoan(previous.rows[0]));
});
// Read access is enforced before any document or workflow operation.
app.use("/api/loans/:id", async (req: AuthRequest, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success)
    return fail(res, 400, "Invalid application ID");
  const r = await db.query("SELECT * FROM loans WHERE id=$1", [req.params.id]);
  const loan: Row | undefined = r.rows[0];
  if (!loan) return fail(res, 404, "Application not found");
  const u = req.user!;
  if (
    u.role === "APPLICANT" &&
    loan.applicant_id !== u.id &&
    !fault("record-leak")
  )
    return fail(res, 403, "Application is private");
  if (u.role === "OFFICER" && loan.scope !== u.scope && !fault("officer-scope"))
    return fail(res, 403, "Outside assigned scope");
  res.locals.loan = loan;
  next();
});
app.get("/api/loans/:id", (_req, res) => res.json(toLoan(res.locals.loan)));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});
app.post(
  "/api/loans/:id/document",
  upload.single("document"),
  async (req: AuthRequest, res) => {
    const loan: Row = res.locals.loan;
    if (req.user!.role !== "APPLICANT")
      return fail(res, 403, "Applicants only");
    if (loan.status !== "DRAFT")
      return fail(res, 409, "Only drafts can be changed");
    const f = req.file;
    if (
      !f ||
      f.mimetype !== "application/pdf" ||
      !f.originalname.toLowerCase().endsWith(".pdf") ||
      f.buffer.subarray(0, 5).toString() !== "%PDF-"
    )
      return fail(res, 400, "A supporting PDF is required");
    const name = f.originalname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const r = await db.query(
      "UPDATE loans SET document_name=$1,document_bytes=$2 WHERE id=$3 AND status='DRAFT' RETURNING *",
      [name, f.buffer, loan.id],
    );
    if (!r.rows[0]) return fail(res, 409, "Draft changed concurrently");
    res.json(toLoan(r.rows[0]));
  },
);
app.post("/api/loans/:id/submit", async (req: AuthRequest, res) => {
  if (req.user!.role !== "APPLICANT") return fail(res, 403, "Applicants only");
  const l: Row = res.locals.loan;
  if (l.status !== "DRAFT")
    return fail(res, 409, "Only drafts can be submitted");
  if (!l.document_name && !fault("missing-document"))
    return fail(res, 400, "A supporting PDF is required");
  // Compare exact NUMERIC values in PostgreSQL to avoid floating-point ratio rounding.
  const r = await db.query(
    "UPDATE loans SET status='SUBMITTED' WHERE id=$1 AND status='DRAFT' AND ($2::boolean OR requested_loan<=property_value*0.8) RETURNING *",
    [l.id, fault("invalid-ratio")],
  );
  if (!r.rows[0])
    return fail(res, 400, "Loan cannot exceed 80% of property value");
  res.json(toLoan(r.rows[0]));
});
app.post("/api/loans/:id/review", async (req: AuthRequest, res) => {
  if (req.user!.role !== "OFFICER") return fail(res, 403, "Loan officers only");
  const p = reviewSchema.safeParse(req.body);
  if (!p.success) return fail(res, 400, "Decision and reason required");
  const l: Row = res.locals.loan;
  if (
    l.status !== "SUBMITTED" &&
    !(fault("duplicate-review") && ["APPROVED", "REJECTED"].includes(l.status))
  )
    return fail(res, 409, "Application must be submitted and reviewed once");
  if (fault("approval-not-persisted") && p.data.decision === "APPROVED")
    return res.json(
      toLoan({ ...l, status: "APPROVED", reason: p.data.reason }),
    );
  // Atomic conditional update: two concurrent officers cannot both finalize a clean loan.
  const r = await db.query(
    "UPDATE loans SET status=$1,reason=$2 WHERE id=$3 AND (status='SUBMITTED' OR $4::boolean) RETURNING *",
    [p.data.decision, p.data.reason, l.id, fault("duplicate-review")],
  );
  if (!r.rows[0]) return fail(res, 409, "Application was already reviewed");
  res.json(toLoan(r.rows[0]));
});
app.use("/api", (_req, res) => fail(res, 404, "API route not found"));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError)
    return fail(res, 400, "Upload exceeds PDF limit (2 MB)");
  if (err instanceof SyntaxError) return fail(res, 400, "Malformed JSON");
  console.error(err);
  return fail(res, 500, "Unexpected server error");
});
const server = app.listen(Number(process.env.PORT ?? 3001), "127.0.0.1", () =>
  console.log("LoanFlow API listening"),
);
async function stop() {
  server.close();
  await db.end();
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
