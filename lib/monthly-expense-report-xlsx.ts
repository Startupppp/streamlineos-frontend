import * as XLSX from "xlsx";
import type { MonthlyExpenseReportRow } from "./email-templates";
import type { MonthlyExpenseReportSummary } from "./monthly-expense-report-pdf";
export function generateMonthlyExpenseReportXlsx(
  monthLabel: string,
  orgName: string,
  rows: MonthlyExpenseReportRow[],
  summary: MonthlyExpenseReportSummary
): Buffer {
  const workbook = XLSX.utils.book_new();

  const headerRow = ["Date", "Employee", "Category", "Amount", "Status"];
  const dataRows = rows.map((r) => [
    r.date,
    r.employeeName,
    r.category,
    r.currency === "INR" ? `₹ ${r.amount}` : r.amount,
    r.status,
  ]);
  const sheetData = [headerRow, ...dataRows];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

  const summarySheetData = [
    ["Summary"],
    ["Total amount", `₹ ${summary.totalAmount}`],
    ["Total expenses", summary.totalCount],
    ["Pending", summary.pendingCount],
    ["Approved", summary.approvedCount],
    ["Paid", summary.paidCount],
    ["Rejected", summary.rejectedCount],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
  summarySheet["!cols"] = [{ wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}
