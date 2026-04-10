import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landingPages, pageViews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const trackSchema = z.object({
  referrer: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  deviceType: z.enum(["desktop", "mobile", "tablet"]).optional(),
});

type Ctx = { params: Promise<{ pageId: string }> };

/** POST /api/marketing/landing-pages/[pageId]/track — public, no auth */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { pageId: id } = await ctx.params;
  const pageId = Number(id);
  if (!Number.isFinite(pageId)) {
    return NextResponse.json({ error: "Invalid page id" }, { status: 400 });
  }

  // Lookup the page to get orgId (and verify page exists)
  const page = await db.query.landingPages.findFirst({
    where: eq(landingPages.id, pageId),
    columns: { id: true, orgId: true, isActive: true },
  });

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Parse body safely — don't block on malformed input
  let input: z.infer<typeof trackSchema> = {};
  try {
    const body = await req.json();
    const parsed = trackSchema.safeParse(body);
    if (parsed.success) input = parsed.data;
  } catch {
    // Ignore parse errors — still record the view
  }

  await db.insert(pageViews).values({
    pageId,
    orgId: page.orgId,
    referrer: input.referrer ?? null,
    country: input.country ?? null,
    city: input.city ?? null,
    deviceType: input.deviceType ?? null,
  });

  return NextResponse.json({ success: true });
}
