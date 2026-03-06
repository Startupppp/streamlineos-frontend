import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks: Record<string, { status: string; message?: string }> = {};

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok" };
  } catch {
    checks.database = { status: "error", message: "Connection failed" };
  }

  if (!process.env.NEXTAUTH_SECRET) {
    checks.auth = { status: "error", message: "NEXTAUTH_SECRET not set" };
  } else {
    checks.auth = { status: "ok" };
  }

  const emailConfigured = !!(
    process.env.SENDGRID_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_PORT)
  );
  checks.email = emailConfigured
    ? { status: "ok" }
    : { status: "warning", message: "No email provider configured" };

  const allHealthy = Object.values(checks).every((c) => c.status !== "error");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
