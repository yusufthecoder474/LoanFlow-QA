CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('APPLICANT','OFFICER')),
 scope TEXT NOT NULL, password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS loans (
 id UUID PRIMARY KEY, applicant_id TEXT NOT NULL REFERENCES users(id), scope TEXT NOT NULL,
 applicant_name TEXT NOT NULL, monthly_income NUMERIC(14,2) NOT NULL CHECK(monthly_income > 0),
 requested_loan NUMERIC(14,2) NOT NULL CHECK(requested_loan > 0), property_value NUMERIC(14,2) NOT NULL CHECK(property_value > 0),
 purpose TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')),
 document_name TEXT, document_bytes BYTEA, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loans_owner_idx ON loans(applicant_id);
CREATE INDEX IF NOT EXISTS loans_scope_idx ON loans(scope);
