import { withAuth, ok, err } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { contentCalendarItems } from "@/lib/db/schema/marketing";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  contentType: z.enum(["blog", "email", "social", "video", "webinar", "whitepaper"]).default("blog"),
  channel: z.string().optional().nullable(),
  status: z.enum(["idea", "in_progress", "review", "scheduled", "published", "cancelled"]).default("idea"),
  scheduledDate: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const orgId = session.orgId;

    const key = `marketing:content-calendar:${orgId}:${month ?? ""}`;
    const rows = await cached(
      key,
      async () => {
        let query = db
          .select()
          .from(contentCalendarItems)
          .where(eq(contentCalendarItems.orgId, orgId))
          .$dynamic();

        if (month) {
          query = query.where(
            and(
              eq(contentCalendarItems.orgId, orgId),
              sql`to_char(${contentCalendarItems.scheduledDate}, 'YYYY-MM') = ${month}`
            )
          );
        }

        return query.orderBy(contentCalendarItems.scheduledDate);
      },
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    const { title, contentType, channel, status, scheduledDate, assignedTo, description, tags } = parsed.data;

    const [created] = await db
      .insert(contentCalendarItems)
      .values({
        orgId: session.orgId,
        title,
        contentType,
        channel: channel ?? null,
        status,
        scheduledDate: scheduledDate ?? null,
        assignedTo: assignedTo ?? null,
        description: description ?? null,
        tags: tags ?? [],
        createdBy: session.user.id,
      })
      .returning();

    await invalidateCachePattern(`marketing:content-calendar:${session.orgId}:*`);

    return ok(created, 201);
  });
}
