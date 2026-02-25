import { NextRequest, NextResponse } from "next/server";
import {
  expireUnusedMonthlyCasualLeaves,
  resetYearlyLeaveBalances,
} from "@/server/actions/leave-actions";

/**
 * Monthly Leave Reset Cron
 *
 * Should be called on the 1st of every month.
 *
 * 1. Expires unused casual leave from the previous month (1 per employee).
 * 2. On January 1st, also resets yearly leave balances for all employees:
 *    - Casual & Sick: fresh allocation (no carry-forward)
 *    - Privilege: carries forward unused + new allocation
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const isJanuary = now.getMonth() === 0;

    // Step 1: Expire unused casual leave from previous month
    const expiryResult = await expireUnusedMonthlyCasualLeaves();

    // Step 2: If January, also reset yearly balances
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
    console.error("Monthly leave reset cron failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
