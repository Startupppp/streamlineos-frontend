import type { z } from "zod";
import type { expensePageDataRowContract, expensePageDataContract } from "@/hooks/api/hr/expenses-schema";

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  month?: string;
  categoryId?: number;
  categoryIds?: number[];
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  status?: string | string[];
  userId?: string;
  paymentMethod?: string;
  projectId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "date" | "amount" | "category" | "status" | "created";
  sortOrder?: "asc" | "desc";
  includeStats?: boolean;
  includePending?: boolean;
  includeCategories?: boolean;
}

export interface ExpenseStats {
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  paidAmount: number;
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  paidCount: number;
  avgExpenseAmount: number;
}

export interface ExpenseCategoryRecord {
  id: number;
  name: string;
  description: string | null;
  budgetLimit: string | null;
  budgetPeriod: string | null;
  isActive: boolean | null;
}

export type ExpenseWithRelations = z.infer<typeof expensePageDataRowContract>;

export type ExpensePageData = z.infer<typeof expensePageDataContract>;

export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

export interface Expense {
  id: number;
  orgId: string;
  userId: string;
  categoryId: number | null;
  category: string;
  amount: string;
  currency: string | null;
  description: string | null;
  receiptUrl: string | null;
  receiptFileName: string | null;
  merchant: string | null;
  paymentMethod: string | null;
  projectId: number | null;
  status: ExpenseStatus | null;
  approverId: string | null;
  approvedAt: Date | string | null;
  rejectionReason: string | null;
  paidAt: Date | string | null;
  transactionRef: string | null;
  expenseDate: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface CreateExpenseInput {
  category: string;
  categoryId?: number;
  amount: number;
  description?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  merchant?: string;
  paymentMethod?: string;
  projectId?: number;
  expenseDate: Date | string;
}

export interface UpdateExpenseStatusInput {
  expenseId: number;
  status: "APPROVED" | "REJECTED" | "PAID";
  rejectionReason?: string;
}
