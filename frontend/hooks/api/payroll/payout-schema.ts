import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const validationItemContract = z.object({
  subjectKey: z.string(),
  userId: z.string().nullable(),
  workerId: z.string().nullable(),
  employeeName: z.string(),
  netAmount: z.string(),
  currency: z.string(),
  maskedAccount: z.string().nullable(),
  scheme: z.string(),
  schemeLabel: z.string(),
  errors: z.array(z.string()),
});

export const payoutValidationResponseContract = z.array(validationItemContract);

const batchRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  runId: z.number(),
  batchNumber: z.string(),
  status: z.string(),
  format: z.string(),
  totalAmount: z.string(),
  itemCount: z.number(),
  generatedBy: z.string().nullable(),
  generatedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  idempotencyKey: z.string().nullable(),
});

export const batchListContract = cursorPageContract(batchRowContract);

const batchItemRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  batchId: z.number(),
  userId: z.string().nullable(),
  workerId: z.string().nullable(),
  runEmployeeId: z.number(),
  amount: z.string(),
  accountMasked: z.string(),
  ifsc: z.string().nullable(),
  status: z.string(),
  transactionRef: z.string().nullable(),
  failureReason: z.string().nullable(),
  paidAt: z.string().nullable(),
});

export const batchDetailContract = z.object({
  batch: batchRowContract,
  items: z.object({
    data: z.array(batchItemRowContract),
    pagination: z.object({
      limit: z.number(),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
  }),
});

const batchFullRowContract = batchRowContract.extend({
  fileKey: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const batchItemFullRowContract = batchItemRowContract.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createBatchResponseContract = z.object({
  batches: z.array(
    z.object({
      batch: batchFullRowContract,
      items: z.array(batchItemFullRowContract),
      fileUrl: z.string().nullable(),
      currencyCode: z.string(),
      replayed: z.boolean(),
    }),
  ),
  replayed: z.boolean(),
  multiCurrency: z.object({
    currencyCount: z.number(),
    currencies: z.array(z.string()),
    batchCount: z.number(),
    honestyNote: z.string(),
  }),
});

export const payoutBankDetailsContract = z.object({
  userId: z.string(),
  employeeName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  bankName: z.string().nullable(),
  branch: z.string().nullable(),
  ifsc: z.string().nullable(),
  accountHolder: z.string().nullable(),
  pfUanNumber: z.string().nullable(),
  bankCountry: z.string().nullable(),
});

export const importBankReturnResponseContract = z.object({
  success: z.boolean(),
  paid: z.number(),
  failed: z.number(),
  skipped: z.number(),
  parseErrors: z.array(z.string()),
  honestyNote: z.string().optional(),
  mode: z.literal("export_manual"),
});

export const batchOperationResponseContract = z.object({ success: z.boolean() });

export type BatchRow = z.infer<typeof batchRowContract>;
export type BatchDetail = z.infer<typeof batchDetailContract>;
