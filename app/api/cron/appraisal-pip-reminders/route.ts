import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import {
  sendAppraisalDueRemindersForTomorrow,
  sendPIPCheckInDueRemindersForTomorrow,
} from "@/lib/email/hr-appraisal-pip";

/** Q35 — 1 day before appraisal stage due + PIP check-in due. */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = cronIdempotencyCheck("appraisal-pip-reminders");
  if (dupeCheck) return dupeCheck;

  try {
    const appraisalReminders = await sendAppraisalDueRemindersForTomorrow();
    const pipReminders = await sendPIPCheckInDueRemindersForTomorrow();
    return NextResponse.json({
      success: true,
      appraisalRemindersSent: appraisalReminders.sent,
      pipCheckInRemindersSent: pipReminders.sent,
    });
  } catch (error) {
    logger.error("appraisal-pip-reminders failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
