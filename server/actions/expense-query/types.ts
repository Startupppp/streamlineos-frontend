"use server";

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

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  budgetLimit: string | null;
  budgetPeriod: string | null;
  isActive: boolean | null;
}

export interface ExpenseWithRelations {
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
  status: string | null;
  approverId: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  paidAt: Date | null;
  transactionRef: string | null;
  expenseDate: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
  } | null;
  approver: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  expenseCategory: ExpenseCategory | null;
  project: {
    id: number;
    name: string;
  } | null;
}

export interface ExpensePageData {
  expenses: ExpenseWithRelations[];
  pendingExpenses: ExpenseWithRelations[];
  stats: ExpenseStats | null;
  categories: ExpenseCategory[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  appliedFilters: ExpenseFilters;
  isAdmin: boolean;
}

export interface CategorySpending {
  categoryId: number;
  categoryName: string;
  budgetLimit: number;
  budgetPeriod: string;
  totalSpent: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  expenseCount: number;
}

export interface ReportData {
  summary: ExpenseStats;
  byCategory: {
    category: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  byEmployee: {
    userId: string;
    userName: string;
    count: number;
    amount: number;
  }[];
  byMonth: {
    month: string;
    count: number;
    amount: number;
  }[];
  byStatus: {
    status: string;
    count: number;
    amount: number;
  }[];
  topExpenses: {
    id: number;
    category: string;
    amount: number;
    description: string;
    userName: string;
    expenseDate: string;
    status: string;
  }[];
}
