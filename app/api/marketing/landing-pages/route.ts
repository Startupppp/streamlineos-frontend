import { type NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { landingPages, pageViews } from "@/lib/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  url: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
});

/** GET /api/marketing/landing-pages */
export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const pages = await db
      .select({
        id: landingPages.id,
        name: landingPages.name,
        url: landingPages.url,
        description: landingPages.description,
        isActive: landingPages.isActive,
        createdAt: landingPages.createdAt,
        totalViews: sql<number>`cast(count(${pageViews.id}) filter (where ${pageViews.pageId} = ${landingPages.id}) as int)`,
        todayViews: sql<number>`cast(count(${pageViews.id}) filter (
          where ${pageViews.pageId} = ${landingPages.id}
          and ${pageViews.viewedAt} >= date_trunc('day', now())
        ) as int)`,
        weekViews: sql<number>`cast(count(${pageViews.id}) filter (
          where ${pageViews.pageId} = ${landingPages.id}
          and ${pageViews.viewedAt} >= now() - interval '7 days'
        ) as int)`,
      })
      .from(landingPages)
      .leftJoin(pageViews, eq(pageViews.pageId, landingPages.id))
      .where(eq(landingPages.orgId, session.orgId))
      .groupBy(
        landingPages.id,
        landingPages.name,
        landingPages.url,
        landingPages.description,
        landingPages.isActive,
        landingPages.createdAt,
      )
      .orderBy(desc(landingPages.createdAt));

    return ok({ pages });
  });
}

/** POST /api/marketing/landing-pages */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);

    const [page] = await db
      .insert(landingPages)
      .values({
        orgId: session.orgId,
        name: input.name,
        url: input.url,
        description: input.description ?? null,
        createdBy: session.user.id,
      })
      .returning();

    return ok(page, 201);
  });
}
