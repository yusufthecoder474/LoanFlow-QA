-- Add retry-safe loan creation without changing existing loans or making keys mandatory.
ALTER TABLE loans ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS idempotency_hash TEXT;
-- A partial index preserves the pre-existing non-idempotent behavior for NULL keys.
CREATE UNIQUE INDEX IF NOT EXISTS loans_applicant_idempotency_unique
  ON loans (applicant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
