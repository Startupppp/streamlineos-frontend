import { NextRequest, NextResponse } from "next/server";
import { sendHolidayNotifications } from "@/server/actions/holiday-actions";

/**
 * Cron endpoint to send holiday notifications
 * Should be triggered daily at 12:00 PM
 * 
 * Setup in Vercel:
 * - Add this to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/holiday-notifications",
 *     "schedule": "0 12 * * *"
 *   }]
 * }
 * 
 * Or use external cron service (like cron-job.org or EasyCron):
 * - URL: https://your-domain.com/api/cron/holiday-notifications
 * - Schedule: Every day at 12:00 PM
 * - Add CRON_SECRET to .env and send as Authorization header
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendHolidayNotifications();
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Sent notifications for ${result.count} upcoming holidays`,
      count: result.count,
    });
  } catch (error) {
    console.error("Holiday notification cron failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}





