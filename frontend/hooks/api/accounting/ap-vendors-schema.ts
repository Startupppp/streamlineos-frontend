import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const vendorCreditListItemContract = z.object({
  id: z.number(),
  vendorCreditNumber: z.string(),
  vendorId: z.number().nullable(),
  vendorName: z.string().nullable(),
  billId: z.number().nullable(),
  status: z.enum(["DRAFT", "POSTED", "APPLIED", "VOID"]),
  reason: z.string().nullable(),
  subtotal: z.string(),
  taxAmount: z.string(),
  total: z.string(),
  appliedAmount: z.string(),
  currency: z.string(),
  createdAt: z.string(),
});

export const vendorCreditListContract = cursorPageContract(vendorCreditListItemContract);

const vendorCreditItemSchemaContract = z.object({
  id: z.number(),
  orgId: z.string(),
  vendorCreditId: z.number(),
  description: z.string(),
  hsnSacCode: z.string().nullable(),
  quantity: z.string(),
  rate: z.string(),
  gstRate: z.string(),
  amount: z.string(),
  lineOrder: z.number(),
});

export const vendorCreditDetailContract = z.object({
  id: z.number(),
  vendorCreditNumber: z.string(),
  vendorId: z.number().nullable(),
  vendorName: z.string().nullable(),
  billId: z.number().nullable(),
  status: z.enum(["DRAFT", "POSTED", "APPLIED", "VOID"]),
  reason: z.string().nullable(),
  subtotal: z.string(),
  taxAmount: z.string(),
  total: z.string(),
  appliedAmount: z.string(),
  currency: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(vendorCreditItemSchemaContract),
});

export const vendorCreditCreatedContract = z.object({
  id: z.number(),
  orgId: z.string(),
  vendorCreditNumber: z.string(),
  vendorId: z.number().nullable(),
  billId: z.number().nullable(),
  status: z.enum(["DRAFT", "POSTED", "APPLIED", "VOID"]),
  reason: z.string().nullable(),
  subtotal: z.string(),
  taxAmount: z.string(),
  total: z.string(),
  appliedAmount: z.string(),
  currency: z.string(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const vendorCreditPostContract = z.object({
  id: z.number(),
  status: z.literal("POSTED"),
});

export const vendorCreditApplyContract = z.object({
  id: z.number(),
  billId: z.number(),
  appliedAmount: z.number(),
});

const recurringBillListItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  vendorId: z.number().nullable(),
  vendorName: z.string().nullable(),
  frequency: z.string(),
  nextRunDate: z.string().nullable(),
  lastRunDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isActive: z.boolean(),
  payload: z.record(z.string(), z.unknown()),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const recurringBillListContract = cursorPageContract(recurringBillListItemContract);

export const recurringBillTemplateContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  vendorId: z.number().nullable(),
  frequency: z.string(),
  nextRunDate: z.string().nullable(),
  lastRunDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isActive: z.boolean(),
  payload: z.record(z.string(), z.unknown()),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const recurringBillDeleteContract = z.object({
  id: z.number(),
  deleted: z.literal(true),
});

export const recurringBillRunNowContract = z.object({
  templateId: z.number(),
  billId: z.number(),
  billNumber: z.string(),
});

export type VendorCreditList = z.infer<typeof vendorCreditListContract>;
export type VendorCreditDetail = z.infer<typeof vendorCreditDetailContract>;
export type RecurringBillList = z.infer<typeof recurringBillListContract>;
