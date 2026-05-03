import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

/** Placeholder: M5 wires email reminders (Q35) — 1 day before stage/check-in due. */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = cronIdempotencyCheck("appraisal-pip-reminders");
  if (dupeCheck) return dupeCheck;

  try {
    return NextResponse.json({ success: true, message: "Reminder scan scheduled (no-op until M5 email wiring)." });
  } catch (error) {
    logger.error("appraisal-pip-reminders failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
