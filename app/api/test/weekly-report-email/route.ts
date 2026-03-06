import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { getWeeklyAttendanceReportTemplate } from "@/lib/email-templates";

const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com";
const SAMPLE_ROWS = [
  { name: "Alice Smith", totalHours: "42.5", autoCheckoutDays: 0, overtimeDays: 2, daysPresent: 5 },
  { name: "Bob Johnson", totalHours: "38.0", autoCheckoutDays: 1, overtimeDays: 0, daysPresent: 5 },
  { name: "Carol Williams", totalHours: "45.0", autoCheckoutDays: 0, overtimeDays: 3, daysPresent: 5 },
];

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

  const weekRange = "Jan 27 - Feb 02, 2025";
  const orgName = "Vaivamm Capital";

  try {
    const html = getWeeklyAttendanceReportTemplate(weekRange, orgName, SAMPLE_ROWS);
    await sendEmail({
      to: TEST_EMAIL,
      subject: `[Test] Weekly Attendance Report - ${weekRange}`,
      html,
    });
    return NextResponse.json({
      success: true,
      message: `Test weekly report sent to ${TEST_EMAIL}`,
    });
  } catch (error) {
    logger.error("Test weekly report email error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test email" },
      { status: 500 }
    );
  }
}
