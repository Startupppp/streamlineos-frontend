import type { MonthlyExpenseReportRow } from "./email-templates";

export interface MonthlyExpenseReportSummary {
  totalAmount: string;
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
}

const MARGIN = 20;
const PAGE_WIDTH = 210;
const ROW_HEIGHT = 9;
const HEADER_ROW_HEIGHT = 11;
const TABLE_LEFT = MARGIN;
const TABLE_RIGHT = PAGE_WIDTH - MARGIN;

// Column layout: Date | Employee | Category | Amount (right-aligned) | Status
const COLS = {
  date: { x: TABLE_LEFT, w: 26 },
  employee: { x: TABLE_LEFT + 26, w: 48 },
  category: { x: TABLE_LEFT + 74, w: 38 },
  amount: { x: TABLE_LEFT + 112, w: 36 },
  status: { x: TABLE_LEFT + 148, w: TABLE_RIGHT - (TABLE_LEFT + 148) },
};

/** Format amount with 2 decimals and thousand separators; add ₹ for INR. */
function formatAmount(amountStr: string, currency: string): string {
  const num = Number.parseFloat(amountStr.replace(/,/g, ""));
  const formatted = Number.isNaN(num)
    ? amountStr
    : num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "INR" ? `₹ ${formatted}` : formatted;
}

/**
 * Generates the monthly expense report as a PDF buffer (for email attachment or download).
 * Uses jsPDF; safe to run on the server.
 */
export async function generateMonthlyExpenseReportPdf(
  monthLabel: string,
  orgName: string,
  rows: MonthlyExpenseReportRow[],
  summary: MonthlyExpenseReportSummary
): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let y = MARGIN;

  const drawLine = () => {
    doc.setDrawColor(220, 220, 220);
    doc.line(TABLE_LEFT, y, TABLE_RIGHT, y);
    y += 3;
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Monthly Expense Report", TABLE_LEFT, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Expense summary for ${orgName} for ${monthLabel}.`, TABLE_LEFT, y);
  y += 14;

  drawLine();

  // Table header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Date", COLS.date.x, y + 7);
  doc.text("Employee", COLS.employee.x, y + 7);
  doc.text("Category", COLS.category.x, y + 7);
  doc.text("Amount", COLS.amount.x + COLS.amount.w, y + 7, { align: "right" });
  doc.text("Status", COLS.status.x, y + 7);
  y += HEADER_ROW_HEIGHT;
  drawLine();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  for (const row of rows) {
    if (y > 268) {
      doc.addPage();
      y = MARGIN;
    }
    const amountStr = formatAmount(row.amount, row.currency);
    doc.text(row.date.substring(0, 12), COLS.date.x, y + 6);
    const empLine = doc.splitTextToSize(row.employeeName, COLS.employee.w - 2)[0] ?? row.employeeName;
    doc.text(empLine, COLS.employee.x, y + 6);
    const catLine = doc.splitTextToSize(row.category, COLS.category.w - 2)[0] ?? row.category;
    doc.text(catLine, COLS.category.x, y + 6);
    doc.text(amountStr, COLS.amount.x + COLS.amount.w, y + 6, { align: "right" });
    doc.text(row.status, COLS.status.x, y + 6);
    y += ROW_HEIGHT;
  }

  y += 10;
  drawLine();

  // Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("Summary", TABLE_LEFT, y + 7);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const summaryAmount = formatAmount(summary.totalAmount, "INR");
  const summaryLine = `Total amount: ${summaryAmount}  |  Total expenses: ${summary.totalCount}  |  Pending: ${summary.pendingCount}  |  Approved: ${summary.approvedCount}  |  Paid: ${summary.paidCount}  |  Rejected: ${summary.rejectedCount}`;
  doc.text(summaryLine, TABLE_LEFT, y + 6);
  y += 14;

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("This is an automated monthly report. Review expense details in the HR portal.", TABLE_LEFT, y + 5);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
