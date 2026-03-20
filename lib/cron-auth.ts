import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export function verifyCronSecret(authHeader: string | null): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const a = Buffer.from(token, "utf-8");
    const b = Buffer.from(cronSecret, "utf-8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/**
 * In-memory idempotency guard for cron jobs.
 * Prevents double execution within the specified window (default: 5 minutes).
 * Note: This is per-instance — for multi-instance deploys, use a DB-based lock.
 */
const cronLastRun = new Map<string, number>();

export function cronIdempotencyCheck(jobName: string, windowMs: number = 5 * 60_000): NextResponse | null {
  const now = Date.now();
  const lastRun = cronLastRun.get(jobName);

  if (lastRun && now - lastRun < windowMs) {
    return NextResponse.json(
      { skipped: true, message: `Job "${jobName}" already ran ${Math.round((now - lastRun) / 1000)}s ago` },
      { status: 200 }
    );
  }

  cronLastRun.set(jobName, now);
  return null;
}
