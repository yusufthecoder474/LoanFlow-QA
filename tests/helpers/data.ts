import { randomUUID } from "node:crypto";
import type { LoanInput } from "../../shared/contracts";
export const data = (overrides: Partial<LoanInput> = {}): LoanInput => ({
  applicantName: `QA-${randomUUID().slice(0, 8)}`,
  monthlyIncome: 6000,
  requestedLoan: 160000,
  propertyValue: 200000,
  purpose: "Synthetic home purchase",
  ...overrides,
});
export const pdf = {
  name: "supporting.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"),
};
