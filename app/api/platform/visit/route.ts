import { NextRequest, NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { platformVisits } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const visitSchema = z.object({
  sessionToken: z.string().min(1).max(64),
  path: z.string().min(1).max(500),
  referrer: z.string().max(500).nullish(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = visitSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const { sessionToken, path, referrer } = parsed.data;

    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const country = req.headers.get("x-vercel-ip-country") ?? null;

    const existing = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(platformVisits)
      .where(eq(platformVisits.sessionToken, sessionToken))
      .then((r) => r[0]?.n ?? 0);

    await db.insert(platformVisits).values({
      sessionToken,
      path,
      referrer: referrer ?? null,
      userAgent,
      country,
      isFirstVisit: existing === 0,
    });
  } catch (error) {
    logger.warn("[visit] beacon failed", { error });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ usage: "POST { sessionToken, path, referrer }" }, { status: 405 });
}
