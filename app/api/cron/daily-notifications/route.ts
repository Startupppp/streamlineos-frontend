import { NextRequest, NextResponse } from "next/server";
import { sendDailyNotifications } from "@/server/actions/daily-notifications";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDailyNotifications();

    return NextResponse.json({
      success: true,
      message: `Daily notifications sent: ${result.birthdayCount} birthdays, ${result.leaveCount} on-leave, ${result.anniversaryCount} anniversaries`,
      ...result,
    });
  } catch (error) {
    logger.error("Daily notification cron failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
