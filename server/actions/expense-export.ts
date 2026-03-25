"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { expenses, expenseStatusEnum } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql, inArray, like, or } from "drizzle-orm";
import { getAuthenticatedMember, isAdminOrOwner } from "@/lib/auth-helpers";
import { isAuthError } from "@/lib/auth-types";
import { format } from "date-fns";
import { getTodayString } from "@/lib/date-utils";
import { users, organizationMembers } from "@/lib/db/schema";
import { sendMonthlyExpenseReportEmail } from "@/lib/email";
import type { MonthlyExpenseReportRow } from "@/lib/email-templates";
import { formatCurrencyFull } from "@/lib/format-utils";

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

interface ExportExpense {
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

function buildExportConditions(
  filters: ExportFilters,
  orgId: string,
  isAdmin: boolean,
  userId: string
) {
  const conditions = [eq(expenses.orgId, orgId)];

  if (!isAdmin) {
    conditions.push(eq(expenses.userId, userId));
  } else if (filters.userId) {
    conditions.push(eq(expenses.userId, filters.userId));
  }

  if (filters.startDate) {
    conditions.push(gte(expenses.expenseDate, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(expenses.expenseDate, filters.endDate));
  }
  if (filters.month) {
    const [year, month] = filters.month.split("-");
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, "0")}`;
    conditions.push(gte(expenses.expenseDate, startDate));
    conditions.push(lte(expenses.expenseDate, endDate));
  }
  if (filters.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }
  if (filters.category) {
    conditions.push(eq(expenses.category, filters.category));
  }
  if (filters.status) {
    type ExpenseStatus = (typeof expenseStatusEnum.enumValues)[number];
    if (Array.isArray(filters.status)) {
      if (filters.status.length > 0 && !filters.status.includes("all")) {
        conditions.push(inArray(expenses.status, filters.status as ExpenseStatus[]));
      }
    } else if (filters.status !== "all") {
      conditions.push(eq(expenses.status, filters.status as ExpenseStatus));
    }
  }
  if (filters.minAmount !== undefined && filters.minAmount > 0) {
    conditions.push(
      gte(sql`CAST(${expenses.amount} AS DECIMAL)`, filters.minAmount)
    );
  }
  if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
    conditions.push(
      lte(sql`CAST(${expenses.amount} AS DECIMAL)`, filters.maxAmount)
    );
  }
  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    conditions.push(eq(expenses.paymentMethod, filters.paymentMethod));
  }
  if (filters.search && filters.search.trim()) {
    const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`LOWER(${expenses.description})`, searchTerm),
        like(sql`LOWER(${expenses.category})`, searchTerm),
        like(sql`LOWER(${expenses.merchant})`, searchTerm)
      )!
    );
  }

  return conditions;
}

async function fetchExpensesForExport(
  conditions: ReturnType<typeof buildExportConditions>
): Promise<ExportExpense[]> {
  const expenseList = await db.query.expenses.findMany({
    where: and(...conditions),
    with: {
      user: true,
      approver: true,
    },
    orderBy: [desc(expenses.expenseDate)],
  });

  return expenseList.map((e) => ({
    id: e.id,
    expenseDate: e.expenseDate,
    category: e.category,
    description: e.description,
    merchant: e.merchant,
    amount: e.amount,
    status: e.status,
    paymentMethod: e.paymentMethod,
    userName: `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.trim() || "Unknown",
    userEmail: e.user?.email || "",
    approverName: e.approver
      ? `${e.approver.firstName || ""} ${e.approver.lastName || ""}`.trim()
      : null,
    approvedAt: e.approvedAt,
    rejectionReason: e.rejectionReason,
    paidAt: e.paidAt,
    transactionRef: e.transactionRef,
  }));
}

async function fetchExportStats(
  conditions: ReturnType<typeof buildExportConditions>
) {
  const result = await db
    .select({
      totalAmount: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
      pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PENDING' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      approvedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'APPROVED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'PAID' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      rejectedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.status} = 'REJECTED' THEN CAST(${expenses.amount} AS DECIMAL) ELSE 0 END), 0)`,
      totalCount: sql<number>`COUNT(*)`,
    })
    .from(expenses)
    .where(and(...conditions));

  return result[0];
}

function generateCSVContent(
  expenseList: ExportExpense[],
  options: ExportOptions,
  stats: Awaited<ReturnType<typeof fetchExportStats>>
): string {
  const headers = [
    "Date",
    "Category",
    "Description",
    "Merchant",
    "Amount (INR)",
    "Status",
    "Payment Method",
    "Employee",
    "Email",
    "Approver",
    "Approved At",
    "Paid At",
    "Transaction Ref",
  ];

  const rows = expenseList.map((e) => [
    e.expenseDate,
    e.category,
    e.description || "",
    e.merchant || "",
    e.amount,
    e.status || "PENDING",
    e.paymentMethod || "",
    e.userName,
    e.userEmail,
    e.approverName || "",
    e.approvedAt ? format(new Date(e.approvedAt), "yyyy-MM-dd HH:mm") : "",
    e.paidAt ? format(new Date(e.paidAt), "yyyy-MM-dd HH:mm") : "",
    e.transactionRef || "",
  ]);

  let csvContent = "";
  if (options.includeHeader !== false) {
    csvContent += `${options.title || "Expense Report"}\n`;
    csvContent += `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}\n`;
    if (options.filters.startDate || options.filters.endDate) {
      csvContent += `Period: ${options.filters.startDate || "Start"} to ${options.filters.endDate || "Present"}\n`;
    }
    if (options.filters.status && options.filters.status !== "all") {
      csvContent += `Status Filter: ${Array.isArray(options.filters.status) ? options.filters.status.join(", ") : options.filters.status}\n`;
    }
    if (options.filters.category) {
      csvContent += `Category: ${options.filters.category}\n`;
    }
    csvContent += `Total Records: ${expenseList.length}\n`;
    csvContent += "\n";
  }
  csvContent += headers.join(",") + "\n";
  csvContent += rows
    .map((row) =>
      row.map((cell) => {
        let val = String(cell).replace(/"/g, '""');
        if (/^[=+\-@\t\r]/.test(val)) val = `'${val}`;
        return `"${val}"`;
      }).join(",")
    )
    .join("\n");
  if (options.includeTotals !== false && stats) {
    csvContent += "\n\n";
    csvContent += "SUMMARY\n";
    csvContent += `Total Amount,${Number(stats.totalAmount).toFixed(2)}\n`;
    csvContent += `Pending,${Number(stats.pendingAmount).toFixed(2)}\n`;
    csvContent += `Approved,${Number(stats.approvedAmount).toFixed(2)}\n`;
    csvContent += `Paid,${Number(stats.paidAmount).toFixed(2)}\n`;
    csvContent += `Rejected,${Number(stats.rejectedAmount).toFixed(2)}\n`;
  }

  return csvContent;
}

interface XLSXExportData {
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

function generateXLSXData(
  expenseList: ExportExpense[],
  options: ExportOptions,
  stats: Awaited<ReturnType<typeof fetchExportStats>>
): XLSXExportData {
  const headers = [
    "Date",
    "Category",
    "Description",
    "Merchant",
    "Amount (INR)",
    "Status",
    "Payment Method",
    "Employee",
    "Email",
    "Approver",
    "Approved At",
    "Paid At",
    "Transaction Ref",
  ];

  const rows = expenseList.map((e) => [
    e.expenseDate,
    e.category,
    e.description || "",
    e.merchant || "",
    parseFloat(e.amount),
    e.status || "PENDING",
    e.paymentMethod || "",
    e.userName,
    e.userEmail,
    e.approverName || "",
    e.approvedAt ? format(new Date(e.approvedAt), "yyyy-MM-dd HH:mm") : "",
    e.paidAt ? format(new Date(e.paidAt), "yyyy-MM-dd HH:mm") : "",
    e.transactionRef || "",
  ]);
  const expensesSheet = [headers, ...rows];
  const summarySheet = [
    ["Expense Report Summary"],
    [""],
    ["Generated", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    [
      "Period",
      `${options.filters.startDate || "Start"} to ${options.filters.endDate || "Present"}`,
    ],
    ["Total Records", expenseList.length],
    [""],
    ["Financial Summary"],
    ["Total Amount", Number(stats?.totalAmount) || 0],
    ["Pending", Number(stats?.pendingAmount) || 0],
    ["Approved", Number(stats?.approvedAmount) || 0],
    ["Paid", Number(stats?.paidAmount) || 0],
    ["Rejected", Number(stats?.rejectedAmount) || 0],
  ];
  const categoryMap = new Map<string, { count: number; amount: number }>();
  expenseList.forEach((e) => {
    const existing = categoryMap.get(e.category) || { count: 0, amount: 0 };
    categoryMap.set(e.category, {
      count: existing.count + 1,
      amount: existing.amount + parseFloat(e.amount),
    });
  });

  const categorySheet = [
    ["Category", "Count", "Amount"],
    ...Array.from(categoryMap.entries()).map(([cat, data]) => [
      cat,
      data.count,
      data.amount,
    ]),
  ];
  const statusMap = new Map<string, { count: number; amount: number }>();
  expenseList.forEach((e) => {
    const status = e.status || "PENDING";
    const existing = statusMap.get(status) || { count: 0, amount: 0 };
    statusMap.set(status, {
      count: existing.count + 1,
      amount: existing.amount + parseFloat(e.amount),
    });
  });

  const statusSheet = [
    ["Status", "Count", "Amount"],
    ...Array.from(statusMap.entries()).map(([status, data]) => [
      status,
      data.count,
      data.amount,
    ]),
  ];

  return {
    sheets: [
      { name: "Expenses", data: expensesSheet },
      { name: "Summary", data: summarySheet },
      { name: "By Category", data: categorySheet },
      { name: "By Status", data: statusSheet },
    ],
    summary: {
      totalAmount: Number(stats?.totalAmount) || 0,
      pendingAmount: Number(stats?.pendingAmount) || 0,
      approvedAmount: Number(stats?.approvedAmount) || 0,
      paidAmount: Number(stats?.paidAmount) || 0,
      rejectedAmount: Number(stats?.rejectedAmount) || 0,
      totalCount: Number(stats?.totalCount) || 0,
    },
    metadata: {
      title: options.title || "Expense Report",
      generatedAt: new Date().toISOString(),
      filters: options.filters,
      recordCount: expenseList.length,
    },
  };
}

interface PDFExportData {
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

function generatePDFData(
  expenseList: ExportExpense[],
  options: ExportOptions,
  stats: Awaited<ReturnType<typeof fetchExportStats>>
): PDFExportData {
  const totalAmount = Number(stats?.totalAmount) || 1;
  const categoryMap = new Map<string, { count: number; amount: number }>();
  expenseList.forEach((e) => {
    const existing = categoryMap.get(e.category) || { count: 0, amount: 0 };
    categoryMap.set(e.category, {
      count: existing.count + 1,
      amount: existing.amount + parseFloat(e.amount),
    });
  });

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
      percentage: (data.amount / totalAmount) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    title: options.title || "Expense Report",
    generatedAt: format(new Date(), "MMMM d, yyyy 'at' h:mm a"),
    filters: {
      period:
        options.filters.startDate || options.filters.endDate
          ? `${options.filters.startDate || "Start"} to ${options.filters.endDate || "Present"}`
          : "All Time",
      status: options.filters.status
        ? Array.isArray(options.filters.status)
          ? options.filters.status.join(", ")
          : options.filters.status
        : "All",
      category: options.filters.category || "All",
      employee: options.filters.userId || "All",
    },
    summary: {
      totalAmount: Number(stats?.totalAmount) || 0,
      pendingAmount: Number(stats?.pendingAmount) || 0,
      approvedAmount: Number(stats?.approvedAmount) || 0,
      paidAmount: Number(stats?.paidAmount) || 0,
      rejectedAmount: Number(stats?.rejectedAmount) || 0,
      totalCount: Number(stats?.totalCount) || 0,
    },
    expenses: expenseList.map((e) => ({
      date: e.expenseDate,
      category: e.category,
      description: e.description || "-",
      merchant: e.merchant || "-",
      amount: parseFloat(e.amount),
      status: e.status || "PENDING",
      employee: e.userName,
      paymentMethod: e.paymentMethod || "-",
    })),
    byCategory,
  };
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

export async function exportExpenses(
  options: ExportOptions
): Promise<ExportResult> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) {
    return { success: false, error: authResult.error };
  }

  const { isAdmin, userId, orgId } = authResult;

  try {
    const conditions = buildExportConditions(
      options.filters,
      orgId,
      isAdmin,
      userId
    );

    const [expenseList, stats] = await Promise.all([
      fetchExpensesForExport(conditions),
      fetchExportStats(conditions),
    ]);

    const dateStr = getTodayString();

    switch (options.format) {
      case "csv": {
        const csvContent = generateCSVContent(expenseList, options, stats);
        return {
          success: true,
          format: "csv",
          data: csvContent,
          filename: `expense-report-${dateStr}.csv`,
          mimeType: "text/csv",
        };
      }

      case "xlsx": {
        const xlsxData = generateXLSXData(expenseList, options, stats);
        return {
          success: true,
          format: "xlsx",
          data: xlsxData,
          filename: `expense-report-${dateStr}.xlsx`,
        };
      }

      case "pdf": {
        const pdfData = generatePDFData(expenseList, options, stats);
        return {
          success: true,
          format: "pdf",
          data: pdfData,
          filename: `expense-report-${dateStr}.pdf`,
        };
      }

      default:
        return { success: false, error: "Invalid export format" };
    }
  } catch (error) {
    logger.error("Expense export failed", error);
    return { success: false, error: "Failed to generate export" };
  }
}

export async function emailExpenseReport(
  filters: ExportFilters
): Promise<{ success: boolean; error?: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) return { success: false, error: authResult.error };

  const { isAdmin, userId, orgId } = authResult;
  if (!isAdmin) return { success: false, error: "Only HR and CEO can send expense reports" };

  try {
    const conditions = buildExportConditions(filters, orgId, isAdmin, userId);
    const [expenseList, stats] = await Promise.all([
      fetchExpensesForExport(conditions),
      fetchExportStats(conditions),
    ]);

    if (expenseList.length === 0) return { success: false, error: "No expenses found for the selected filters" };

    // Get CEO and HR emails
    const adminMembers = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.orgId, orgId),
      ),
      with: { user: true },
    });
    const recipientEmails = adminMembers
      .filter((m) => m.role === "CEO" || m.role === "HR")
      .map((m) => m.user?.email)
      .filter((e): e is string => !!e);

    if (recipientEmails.length === 0) return { success: false, error: "No CEO/HR email addresses found" };

    const org = await db.query.organizations.findFirst({
      where: eq(organizationMembers.orgId, orgId),
    });

    const periodLabel = filters.startDate && filters.endDate
      ? `${filters.startDate} to ${filters.endDate}`
      : filters.startDate
        ? `From ${filters.startDate}`
        : "All Time";

    const rows: MonthlyExpenseReportRow[] = expenseList.map((e) => ({
      employeeName: e.userName,
      category: e.category,
      amount: formatCurrencyFull(e.amount),
      currency: "INR",
      date: e.expenseDate,
      status: e.status || "PENDING",
      description: e.description || "-",
    }));

    const summary = {
      totalAmount: formatCurrencyFull(stats?.totalAmount || 0),
      totalCount: Number(stats?.totalCount) || 0,
      pendingCount: expenseList.filter((e) => e.status === "PENDING").length,
      approvedCount: expenseList.filter((e) => e.status === "APPROVED").length,
      paidCount: expenseList.filter((e) => e.status === "PAID").length,
      rejectedCount: expenseList.filter((e) => e.status === "REJECTED").length,
    };

    await sendMonthlyExpenseReportEmail(
      periodLabel,
      org?.name || "Vaivamm Capital",
      rows,
      summary,
      recipientEmails,
    );

    return { success: true };
  } catch (error) {
    logger.error("Failed to email expense report", error);
    return { success: false, error: "Failed to send email" };
  }
}
