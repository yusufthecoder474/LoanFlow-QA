import { db } from "../../server/db";
export async function record(id: string) {
  const r = await db.query(
    "SELECT id,applicant_id,status,document_name,reason,monthly_income,requested_loan,property_value FROM loans WHERE id=$1",
    [id],
  );
  if (!r.rows[0]) throw new Error(`No SQL record: ${id}`);
  return r.rows[0];
}
export async function cleanup() {
  await db.query("DELETE FROM loans WHERE applicant_name LIKE 'QA-%'");
}
