import { NextRequest, NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformVisits } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      sessionToken?: string;
      path?: string;
      referrer?: string | null;
    };

    if (!body.sessionToken || !body.path || body.sessionToken.length > 64 || body.path.length > 500) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const referrer = (body.referrer ?? "").slice(0, 500) || null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const country = req.headers.get("x-vercel-ip-country") ?? null;

    const existing = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(platformVisits)
      .where(eq(platformVisits.sessionToken, body.sessionToken))
      .then((r) => r[0]?.n ?? 0);

    await db.insert(platformVisits).values({
      sessionToken: body.sessionToken,
      path: body.path.slice(0, 500),
      referrer,
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

// MAX_BODY_BYTES kept for documentation — bodies are validated by length above.
void MAX_BODY_BYTES;
