export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  month?: string;
  categoryId?: number;
  category?: string;
  status?: string | string[];
  userId?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface ExportOptions {
  format: "csv" | "xlsx" | "pdf";
  filters: ExportFilters;
  includeHeader?: boolean;
  includeTotals?: boolean;
  title?: string;
}

export interface ExportExpense {
  id: number;
  expenseDate: string;
  category: string;
  description: string | null;
  merchant: string | null;
  amount: string;
  status: string | null;
  paymentMethod: string | null;
  userName: string;
  userEmail: string;
  approverName: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  paidAt: Date | null;
  transactionRef: string | null;
}

export interface XLSXExportData {
  sheets: {
    name: string;
    data: (string | number)[][];
  }[];
  summary: {
    totalAmount: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
    rejectedAmount: number;
    totalCount: number;
  };
  metadata: {
    title: string;
    generatedAt: string;
    filters: ExportFilters;
    recordCount: number;
  };
}

export interface PDFExportData {
  title: string;
  generatedAt: string;
  filters: {
    period: string;
    status: string;
    category: string;
    employee: string;
  };
  summary: {
    totalAmount: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
    rejectedAmount: number;
    totalCount: number;
  };
  expenses: {
    date: string;
    category: string;
    description: string;
    merchant: string;
    amount: number;
    status: string;
    employee: string;
    paymentMethod: string;
  }[];
  byCategory: {
    category: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
}

export type ExportResult =
  | {
      success: true;
      format: "csv";
      data: string;
      filename: string;
      mimeType: string;
    }
  | {
      success: true;
      format: "xlsx";
      data: XLSXExportData;
      filename: string;
    }
  | {
      success: true;
      format: "pdf";
      data: PDFExportData;
      filename: string;
    }
  | { success: false; error: string };
