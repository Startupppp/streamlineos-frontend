import { format } from "date-fns";
import type { ExportExpense, ExportOptions, XLSXExportData, PDFExportData } from "./types";
import type { fetchExportStats } from "./query";

export function generateXLSXData(
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
  for (const e of expenseList) {
    const existing = categoryMap.get(e.category) || { count: 0, amount: 0 };
    categoryMap.set(e.category, {
      count: existing.count + 1,
      amount: existing.amount + parseFloat(e.amount),
    });
  }

  const categorySheet = [
    ["Category", "Count", "Amount"],
    ...Array.from(categoryMap.entries()).map(([cat, data]) => [
      cat,
      data.count,
      data.amount,
    ]),
  ];

  const statusMap = new Map<string, { count: number; amount: number }>();
  for (const e of expenseList) {
    const status = e.status || "PENDING";
    const existing = statusMap.get(status) || { count: 0, amount: 0 };
    statusMap.set(status, {
      count: existing.count + 1,
      amount: existing.amount + parseFloat(e.amount),
    });
  }

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

export function generatePDFData(
  expenseList: ExportExpense[],
  options: ExportOptions,
  stats: Awaited<ReturnType<typeof fetchExportStats>>
): PDFExportData {
  const totalAmount = Number(stats?.totalAmount) || 1;
  const categoryMap = new Map<string, { count: number; amount: number }>();
  for (const e of expenseList) {
    const existing = categoryMap.get(e.category) || { count: 0, amount: 0 };
    categoryMap.set(e.category, {
      count: existing.count + 1,
      amount: existing.amount + parseFloat(e.amount),
    });
  }

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
