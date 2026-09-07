import { z } from "zod";

export const expenseRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  categoryId: z.number().int().nullable(),
  category: z.string(),
  amount: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  receiptUrl: z.string().nullable(),
  receiptFileName: z.string().nullable(),
  merchant: z.string().nullable(),
  receiptNumber: z.string().nullable(),
  receiptHash: z.string().nullable(),
  taxAmount: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  projectId: z.number().int().nullable(),
  status: z.string(),
  userMembershipId: z.number().int().nullable(),
  approverId: z.string().nullable(),
  approverMembershipId: z.number().int().nullable(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  paidAt: z.string().nullable(),
  transactionRef: z.string().nullable(),
  reimbursementBatchId: z.number().int().nullable(),
  postedJournalEntryId: z.number().int().nullable(),
  policyFlag: z.string().nullable(),
  expenseDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const expenseCategoryRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  budgetLimit: z.string().nullable(),
  budgetPeriod: z.string(),
  isActive: z.boolean(),
  ledgerAccountId: z.number().int().nullable(),
  createdAt: z.string(),
});

const expenseStatsContract = z.object({
  totalAmount: z.number(),
  pendingAmount: z.number(),
  approvedAmount: z.number(),
  rejectedAmount: z.number(),
  paidAmount: z.number(),
  totalCount: z.number(),
  pendingCount: z.number(),
  approvedCount: z.number(),
  rejectedCount: z.number(),
  paidCount: z.number(),
  avgExpenseAmount: z.number(),
});

export const expensePageDataContract = z.object({
  expenses: z.array(expenseRowContract),
  pendingExpenses: z.array(expenseRowContract),
  stats: expenseStatsContract.nullable(),
  categories: z.array(expenseCategoryRowContract),
  pagination: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
  isAdmin: z.boolean(),
});

export const expenseExportJobContract = z.object({
  id: z.string(),
  status: z.enum(["pending", "running", "completed", "failed", "expired"]),
  processedRows: z.number().int(),
  rowCount: z.number().int().nullable(),
  truncated: z.boolean(),
  fileName: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});
