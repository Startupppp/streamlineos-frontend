import type { z } from "zod";
import type {
  expensePageDataRowContract,
  expensePageDataContract,
} from "@/hooks/api/hr/expenses-schema";

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



export type ExpenseWithRelations = z.infer<typeof expensePageDataRowContract>;

export type ExpensePageData = z.infer<typeof expensePageDataContract>;


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
