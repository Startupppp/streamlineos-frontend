import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { landingPages, pageViews } from "@/lib/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ pageId: string }> };

/** GET /api/marketing/landing-pages/[pageId] */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { pageId: id } = await ctx.params;
  const pageId = Number(id);
  if (!Number.isFinite(pageId)) return err("Invalid page id", 400);

  return withAuth(async (session) => {
    const page = await db.query.landingPages.findFirst({
      where: and(eq(landingPages.id, pageId), eq(landingPages.orgId, session.orgId)),
    });
    if (!page) return err("Landing page not found", 404);

    // Daily views for last 30 days
    const viewsByDay = await db
      .select({
        date: sql<string>`to_char(${pageViews.viewedAt}, 'YYYY-MM-DD')`,
        views: sql<number>`cast(count(*) as int)`,
      })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.pageId, pageId),
          sql`${pageViews.viewedAt} >= now() - interval '30 days'`,
        ),
      )
      .groupBy(sql`to_char(${pageViews.viewedAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${pageViews.viewedAt}, 'YYYY-MM-DD')`);

    // Device breakdown
    const deviceBreakdown = await db
      .select({
        device: sql<string>`coalesce(${pageViews.deviceType}, 'unknown')`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(pageViews)
      .where(eq(pageViews.pageId, pageId))
      .groupBy(pageViews.deviceType);

    // Top referrers
    const referrerBreakdown = await db
      .select({
        referrer: sql<string>`coalesce(${pageViews.referrer}, 'direct')`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(pageViews)
      .where(eq(pageViews.pageId, pageId))
      .groupBy(pageViews.referrer)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Total / today / week stats for the summary
    const [stats] = await db
      .select({
        totalViews: sql<number>`cast(count(*) as int)`,
        todayViews: sql<number>`cast(count(*) filter (where ${pageViews.viewedAt} >= date_trunc('day', now())) as int)`,
        weekViews: sql<number>`cast(count(*) filter (where ${pageViews.viewedAt} >= now() - interval '7 days') as int)`,
      })
      .from(pageViews)
      .where(eq(pageViews.pageId, pageId));

    return ok({
      page: {
        ...page,
        totalViews: stats?.totalViews ?? 0,
        todayViews: stats?.todayViews ?? 0,
        weekViews: stats?.weekViews ?? 0,
      },
      viewsByDay,
      deviceBreakdown,
      referrerBreakdown,
    });
  });
}

/** PATCH /api/marketing/landing-pages/[pageId] */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { pageId: id } = await ctx.params;
  const pageId = Number(id);
  if (!Number.isFinite(pageId)) return err("Invalid page id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(landingPages)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(landingPages.id, pageId), eq(landingPages.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Landing page not found", 404);
    return ok(updated);
  });
}

/** DELETE /api/marketing/landing-pages/[pageId] */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { pageId: id } = await ctx.params;
  const pageId = Number(id);
  if (!Number.isFinite(pageId)) return err("Invalid page id", 400);

  return withAuth(async (session) => {
    await db
      .delete(landingPages)
      .where(and(eq(landingPages.id, pageId), eq(landingPages.orgId, session.orgId)));

    return ok({ success: true });
  });
}
