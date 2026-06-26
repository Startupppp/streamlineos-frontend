import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { hiringFlows, hiringFlowRounds } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { limit, offset } = parseQuery(req, listSchema);
    const orgId = session.orgId;

    const key = `hr:hiring-flows:list:${orgId}:${limit}:${offset}`;
    const data = await cached(
      key,
      () =>
        db.query.hiringFlows.findMany({
          where: eq(hiringFlows.orgId, orgId),
          orderBy: [desc(hiringFlows.isDefault), desc(hiringFlows.createdAt)],
          limit,
          offset,
          with: { rounds: { orderBy: (r, { asc }) => [asc(r.orderIndex)] } },
        }),
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);

    if (body.isDefault) {
      await db
        .update(hiringFlows)
        .set({ isDefault: false })
        .where(and(eq(hiringFlows.orgId, session.orgId), eq(hiringFlows.isDefault, true)));
    }

    const [flow] = await db
      .insert(hiringFlows)
      .values({
        orgId: session.orgId,
        name: body.name.trim(),
        isDefault: body.isDefault ?? false,
        createdBy: session.user.id,
      })
      .returning();

    await invalidateCachePattern(`hr:hiring-flows:list:${session.orgId}:*`);
    return ok(flow, 201);
  });
}

export const dynamic = "force-dynamic";
