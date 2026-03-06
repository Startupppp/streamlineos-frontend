import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { getMonthlyExpenseReportTemplate } from "@/lib/email-templates";
import { generateMonthlyExpenseReportXlsx } from "@/lib/monthly-expense-report-xlsx";

const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com";

const SAMPLE_ROWS = [
  { date: "Jan 15, 2025", employeeName: "Alice Smith", category: "Travel", amount: "2,500.00", currency: "INR", status: "PAID" },
  { date: "Jan 18, 2025", employeeName: "Bob Johnson", category: "Meals", amount: "850.00", currency: "INR", status: "APPROVED" },
  { date: "Jan 22, 2025", employeeName: "Carol Williams", category: "Software", amount: "5,000.00", currency: "INR", status: "PENDING" },
  { date: "Jan 28, 2025", employeeName: "Alice Smith", category: "Office Supplies", amount: "1,200.00", currency: "INR", status: "PAID" },
];

const SAMPLE_SUMMARY = {
  totalAmount: "9,550.00",
  totalCount: 4,
  pendingCount: 1,
  approvedCount: 1,
  paidCount: 2,
  rejectedCount: 0,
};
export async function GET() {
  const allowed =
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_TEST_EMAIL === "1";
  if (!allowed) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthLabel = "January 2025";
  const orgName = "Vaivamm Capital";

  try {
    const html = getMonthlyExpenseReportTemplate(
      monthLabel,
      orgName,
      SAMPLE_ROWS,
      SAMPLE_SUMMARY
    );
    const xlsxBuffer = generateMonthlyExpenseReportXlsx(
      monthLabel,
      orgName,
      SAMPLE_ROWS,
      SAMPLE_SUMMARY
    );
    await sendEmail({
      to: TEST_EMAIL,
      subject: `[Test] Monthly Expense Report - ${monthLabel}`,
      html,
      attachments: [
        {
          filename: "Monthly-Expense-Report-January-2025.xlsx",
          content: xlsxBuffer,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
    return NextResponse.json({
      success: true,
      message: `Test monthly expense report (with XLSX) sent to ${TEST_EMAIL}`,
    });
  } catch (error) {
    logger.error("Test monthly expense report email error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test email" },
      { status: 500 }
    );
  }
}
