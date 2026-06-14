import { format } from "date-fns";
import type { ExportExpense, ExportOptions } from "./types";
import type { fetchExportStats } from "./query";

const CSV_HEADERS = [
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

function escapeCSVCell(value: string): string {
  let val = String(value).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(val)) val = `'${val}`;
  return `"${val}"`;
}

export function generateCSVContent(
  expenseList: ExportExpense[],
  options: ExportOptions,
  stats: Awaited<ReturnType<typeof fetchExportStats>>
): string {
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

  csvContent += CSV_HEADERS.join(",") + "\n";
  csvContent += rows
    .map((row) => row.map(escapeCSVCell).join(","))
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
