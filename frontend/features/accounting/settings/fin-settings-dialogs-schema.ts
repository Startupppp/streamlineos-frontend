import { z } from "zod";
import type { ApprovalRecordType } from "@/types/accounting/taxes";

export const RECORD_TYPES: ReadonlyArray<string> = [
  "MANUAL_JOURNAL", "PURCHASE_BILL", "VENDOR_PAYMENT",
  "EXPENSE", "CREDIT_NOTE", "PERIOD_REOPEN", "BANK_ADJUSTMENT",
];

export function isApprovalRecordType(value: string): value is ApprovalRecordType {
  return RECORD_TYPES.includes(value);
}

export const sequenceSchema = z.object({
  prefix: z.string().min(1),
  padding: z.string().min(1),
  nextNumber: z.string().min(1),
});
export type SequenceFormValues = z.infer<typeof sequenceSchema>;

export const systemAccountSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
});
export type SystemAccountFormValues = z.infer<typeof systemAccountSchema>;

export const policySchema = z.object({
  recordType: z.enum(["MANUAL_JOURNAL", "PURCHASE_BILL", "VENDOR_PAYMENT", "EXPENSE", "CREDIT_NOTE", "PERIOD_REOPEN", "BANK_ADJUSTMENT"]),
  minAmount: z.string(),
  approverRole: z.string(),
  isActive: z.boolean(),
});
export type PolicyFormValues = z.infer<typeof policySchema>;

export const rateSchema = z.object({
  fromCurrency: z.string().min(1),
  toCurrency: z.string().min(1),
  rate: z.string().min(1),
  asOfDate: z.string().min(1),
});
export type RateFormValues = z.infer<typeof rateSchema>;

export const paymentTermSchema = z.object({
  label: z.string().min(1, "Label is required"),
  days: z.string().min(1, "Days is required"),
  isDefault: z.boolean(),
});
export type PaymentTermFormValues = z.infer<typeof paymentTermSchema>;
