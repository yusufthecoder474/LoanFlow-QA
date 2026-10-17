import { z } from "zod";
export const statusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
]);
const money = z
  .number()
  .positive()
  .max(1_000_000_000)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
    "Use at most two decimal places",
  );
export const inputSchema = z
  .object({
    applicantName: z.string().trim().min(2).max(100),
    monthlyIncome: money,
    requestedLoan: money,
    propertyValue: money,
    purpose: z.string().trim().min(3).max(200),
  })
  .strict();
export const loanSchema = inputSchema
  .extend({
    id: z.string().uuid(),
    applicantId: z.string(),
    scope: z.string(),
    status: statusSchema,
    documentName: z.string().nullable(),
    reason: z.string().nullable(),
  })
  .strict();
export const userSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    role: z.enum(["APPLICANT", "OFFICER"]),
    scope: z.string(),
  })
  .strict();
export const reviewSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().min(3).max(300),
  })
  .strict();
export const errorSchema = z.object({
  error: z.string(),
  issues: z.array(z.unknown()).optional(),
});
export type LoanInput = z.infer<typeof inputSchema>;
export type Loan = z.infer<typeof loanSchema>;
export type User = z.infer<typeof userSchema>;
