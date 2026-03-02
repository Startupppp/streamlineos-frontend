import { NextRequest, NextResponse } from "next/server";
import {
  expireUnusedMonthlyCasualLeaves,
  resetYearlyLeaveBalances,
} from "@/server/actions/leave-actions";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const isJanuary = now.getMonth() === 0;
    const expiryResult = await expireUnusedMonthlyCasualLeaves();
    let yearlyResult = null;
    if (isJanuary) {
      yearlyResult = await resetYearlyLeaveBalances();
    }

    return NextResponse.json({
      success: true,
      monthlyExpiry: expiryResult,
      yearlyReset: yearlyResult,
    });
  } catch (error) {
    logger.error("Monthly leave reset cron failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
