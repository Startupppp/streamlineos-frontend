import type { ExpenseStatus } from "@/features/accounting/shared";

export type ReimbursementBatchStatus = "DRAFT" | "APPROVED" | "PAID";
export type PolicyFlag = "OVER_LIMIT" | "RECEIPT_REQUIRED";

export interface FinExpenseUser {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  image?: string | null;
}

export interface FinExpenseCategory {
  id: number;
  name: string;
  isActive: boolean | null;
}

export interface FinExpenseItem {
  id: number;
  orgId: string;
  userId: string;
  categoryId: number | null;
  category: string;
  amount: string;
  currency: string;
  description: string | null;
  receiptUrl: string | null;
  receiptFileName: string | null;
  merchant: string | null;
  receiptNumber: string | null;
  taxAmount: string | null;
  paymentMethod: string | null;
  status: string;
  approverId: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  policyFlag: string | null;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  user?: FinExpenseUser | null;
  expenseCategory?: FinExpenseCategory | null;
}

export type FinReceiptInboxItem = FinExpenseItem;

export interface ReimbursementBatchItem {
  id: number;
  amount: string;
  category: string;
  expenseDate: string;
  description: string | null;
  status: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
}

export interface ReimbursementBatchCreator {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
}

export interface FinReimbursementBatch {
  id: number;
  orgId: string;
  name: string;
  status: string;
  totalAmount: string;
  paidDate: string | null;
  journalEntryId: number | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator: ReimbursementBatchCreator | null;
  approver: ReimbursementBatchCreator | null;
}

export type FinReimbursementBatchCreateResult = Omit<FinReimbursementBatch, "creator" | "approver">;

export interface FinReimbursementBatchDetail {
  batch: FinReimbursementBatch;
  items: ReimbursementBatchItem[];
}

export interface FinExpensePolicy {
  id: number;
  orgId: string;
  name: string;
  categoryId: number | null;
  maxAmount: string | null;
  requiresReceiptAbove: string | null;
  requiresApprovalAbove: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: FinExpenseCategory | null;
}

export type FinExpensePolicyCreateResult = Omit<FinExpensePolicy, "category">;

export interface ListResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ItemsResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreateBatchInput {
  name: string;
  expenseIds: number[];
}

export interface PayBatchInput {
  paidDate: string;
  bankAccountId?: number;
}

export interface PatchReceiptInput {
  merchant?: string;
  receiptNumber?: string;
  taxAmount?: number;
  categoryId?: number;
}

export interface CreatePolicyInput {
  name: string;
  categoryId?: number;
  maxAmount?: number;
  requiresReceiptAbove?: number;
  requiresApprovalAbove?: number;
  isActive: boolean;
}

export type UpdatePolicyInput = Partial<CreatePolicyInput>;

export interface ExpensePageDataRow {
  id: number;
  orgId: string;
  userId: string;
  categoryId: number | null;
  category: string;
  amount: string;
  currency: string;
  description: string | null;
  receiptUrl: string | null;
  receiptFileName: string | null;
  merchant: string | null;
  receiptNumber: string | null;
  receiptHash: string | null;
  taxAmount: string | null;
  paymentMethod: string | null;
  projectId: number | null;
  status: string;
  userMembershipId: number | null;
  approverId: string | null;
  approverMembershipId: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  transactionRef: string | null;
  reimbursementBatchId: number | null;
  postedJournalEntryId: number | null;
  policyFlag: string | null;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
}
