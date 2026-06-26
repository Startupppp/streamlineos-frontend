import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { redis } from "@/lib/redis";

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

export async function cronIdempotencyCheck(
  jobName: string,
  windowSec: number = 300,
): Promise<NextResponse | null> {
  if (!redis) return null;

  const key = `cron:lock:${jobName}`;
  const set = await redis.set(key, "1", { nx: true, ex: windowSec });

  if (set === null) {
    return NextResponse.json(
      { skipped: true, message: `Job "${jobName}" is already running or ran recently` },
      { status: 200 },
    );
  }

  return null;
}
