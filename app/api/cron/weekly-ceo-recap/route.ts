import { NextRequest, NextResponse } from "next/server";
import { generateAndSendWeeklyCeoRecap } from "@/server/actions/weekly-ceo-recap";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateAndSendWeeklyCeoRecap();
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Weekly CEO recap cron failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
