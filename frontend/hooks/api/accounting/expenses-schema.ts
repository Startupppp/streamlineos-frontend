import { z } from "zod";

const expenseCategoryContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  budgetLimit: z.string().nullable(),
  budgetPeriod: z.string(),
  isActive: z.boolean(),
  ledgerAccountId: z.number().nullable(),
  createdAt: z.string(),
});

export const expensePolicyContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  categoryId: z.number().nullable(),
  maxAmount: z.string().nullable(),
  requiresReceiptAbove: z.string().nullable(),
  requiresApprovalAbove: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  category: expenseCategoryContract.nullable(),
});

export const expensePolicyListContract = z.array(expensePolicyContract);

const expenseUserContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
});

const expenseWithRelationsContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  categoryId: z.number().nullable(),
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
  projectId: z.number().nullable(),
  status: z.string(),
  userMembershipId: z.number().nullable(),
  approverId: z.string().nullable(),
  approverMembershipId: z.number().nullable(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  paidAt: z.string().nullable(),
  transactionRef: z.string().nullable(),
  reimbursementBatchId: z.number().nullable(),
  postedJournalEntryId: z.number().nullable(),
  policyFlag: z.string().nullable(),
  expenseDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: expenseUserContract,
  expenseCategory: expenseCategoryContract.nullable(),
});

export const receiptInboxListContract = z.object({
  items: z.array(expenseWithRelationsContract),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export const expenseReceiptUpdateContract = z.object({ success: z.literal(true) });

const reimbursementActorContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
});

const reimbursementBatchContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  status: z.string(),
  totalAmount: z.string(),
  paidDate: z.string().nullable(),
  journalEntryId: z.number().nullable(),
  bankAccountId: z.number().nullable(),
  createdBy: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: reimbursementActorContract,
  approver: reimbursementActorContract.nullable(),
});

export const reimbursementBatchListContract = z.object({
  data: z.array(reimbursementBatchContract),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

const reimbursementExpenseItemContract = z.object({
  id: z.number(),
  amount: z.string(),
  category: z.string(),
  expenseDate: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  userId: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

export const reimbursementBatchDetailContract = z.object({
  batch: reimbursementBatchContract,
  items: z.array(reimbursementExpenseItemContract),
});

export const reimbursementBatchCreatedContract = reimbursementBatchContract.omit({
  creator: true,
  approver: true,
});

export const reimbursementApproveContract = z.object({ success: z.literal(true) });

export const reimbursementPayContract = z.object({
  success: z.literal(true),
  replayed: z.boolean(),
  entryId: z.number().nullable(),
});

export const expensePolicyCreatedContract = expensePolicyContract.omit({ category: true });

export const expensePolicyUpdatedContract = z.object({ success: z.literal(true) });

export const expensePolicyDeleteContract = z.object({ success: z.literal(true) });
export const expenseApproveContract = z.object({ success: z.literal(true) });

export const expenseRejectContract = z.object({ success: z.literal(true) });

const pageDataExpenseRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  categoryId: z.number().nullable(),
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
  projectId: z.number().nullable(),
  status: z.string(),
  userMembershipId: z.number().nullable(),
  approverId: z.string().nullable(),
  approverMembershipId: z.number().nullable(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  paidAt: z.string().nullable(),
  transactionRef: z.string().nullable(),
  reimbursementBatchId: z.number().nullable(),
  postedJournalEntryId: z.number().nullable(),
  policyFlag: z.string().nullable(),
  expenseDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
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

export const hrExpensePageDataResponseContract = z.object({
  expenses: z.array(pageDataExpenseRowContract),
  pendingExpenses: z.array(pageDataExpenseRowContract),
  stats: expenseStatsContract,
  categories: z.array(expenseCategoryContract),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  isAdmin: z.boolean(),
});

export type ReceiptInboxList = z.infer<typeof receiptInboxListContract>;
export type ReimbursementBatchList = z.infer<typeof reimbursementBatchListContract>;
export type ReimbursementBatchDetail = z.infer<typeof reimbursementBatchDetailContract>;
export type ExpensePolicy = z.infer<typeof expensePolicyContract>;
