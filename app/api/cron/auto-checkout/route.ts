import { NextRequest, NextResponse } from "next/server";
import { processAutoCheckout } from "@/server/actions/auto-checkout";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processAutoCheckout();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Auto-checkout cron failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
