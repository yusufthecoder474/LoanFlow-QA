import { expect } from "@playwright/test";
import { record } from "./db";
import type { Loan } from "../../shared/contracts";
export async function persisted(loan: Loan) {
  const sql = await record(loan.id);
  expect(sql.status).toBe(loan.status);
  expect(sql.applicant_id).toBe(loan.applicantId);
  expect(sql.document_name).toBe(loan.documentName);
  expect(sql.reason).toBe(loan.reason);
  expect(Number(sql.requested_loan)).toBe(loan.requestedLoan);
}
