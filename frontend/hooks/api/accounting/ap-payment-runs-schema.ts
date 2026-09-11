import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const paymentRunListItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  scheduledDate: z.string().nullable(),
  status: z.enum(["DRAFT", "APPROVED", "COMPLETED", "CANCELLED"]),
  totalAmount: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  itemCount: z.number(),
});

export const paymentRunListContract = cursorPageContract(paymentRunListItemContract);

const paymentRunItemContract = z.object({
  id: z.number(),
  runId: z.number(),
  billId: z.number(),
  billNumber: z.string().nullable(),
  vendorId: z.number().nullable(),
  vendorName: z.string().nullable(),
  amount: z.string(),
  status: z.enum(["PENDING", "PAID", "SKIPPED"]),
  vendorPaymentId: z.number().nullable(),
  dueDate: z.string().nullable(),
});

const paymentRunRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  status: z.enum(["DRAFT", "APPROVED", "COMPLETED", "CANCELLED"]),
  scheduledDate: z.string().nullable(),
  totalAmount: z.string(),
  createdBy: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paymentRunDetailContract = paymentRunRowContract.extend({
  items: z.array(paymentRunItemContract),
});

export const paymentRunSummaryContract = paymentRunRowContract.extend({
  itemCount: z.number().optional(),
});

export const paymentRunItemUpdateContract = z.object({
  id: z.number(),
  updated: z.literal(true),
});

export const paymentRunCancelContract = z.object({
  id: z.number(),
  status: z.literal("CANCELLED"),
});

export const paymentRunExecuteContract = z.object({
  id: z.number(),
  status: z.literal("COMPLETED"),
});

export const vendorPaymentAllocateContract = z.object({
  vendorPaymentId: z.number(),
  allocated: z.number(),
});

export type PaymentRunList = z.infer<typeof paymentRunListContract>;
export type PaymentRunDetail = z.infer<typeof paymentRunDetailContract>;
