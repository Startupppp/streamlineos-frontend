import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const checks: Record<string, { status: string }> = {};

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok" };
  } catch {
    checks.database = { status: "error" };
  }

  checks.auth = process.env.NEXTAUTH_SECRET ? { status: "ok" } : { status: "error" };

  const emailConfigured = !!(
    process.env.SENDGRID_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_PORT)
  );
  checks.email = emailConfigured ? { status: "ok" } : { status: "warning" };

  const allHealthy = Object.values(checks).every((c) => c.status !== "error");

  // Only return aggregate status publicly — no configuration details
  const isInternalRequest =
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  if (isInternalRequest) {
    return NextResponse.json(
      { status: allHealthy ? "healthy" : "unhealthy", timestamp: new Date().toISOString(), checks },
      { status: allHealthy ? 200 : 503 }
    );
  }

  return NextResponse.json(
    { status: allHealthy ? "healthy" : "unhealthy" },
    { status: allHealthy ? 200 : 503 }
  );
}
