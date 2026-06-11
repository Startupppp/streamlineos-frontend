import { withAuth, ok, parseQuery, parseBody } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { territories } from "@/lib/db/schema/crm";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  states: z.array(z.string()).optional().default([]),
  cities: z.array(z.string()).optional().default([]),
  assignedReps: z.array(z.number()).optional().default([]),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { limit } = parseQuery(req, listSchema);
    const orgId = session.orgId;

    const key = `crm:territories:${orgId}:${limit}`;
    const rows = await cached(
      key,
      () =>
        db
          .select({
            id: territories.id,
            name: territories.name,
            states: territories.states,
            cities: territories.cities,
            assignedReps: territories.assignedReps,
            description: territories.description,
            isActive: territories.isActive,
            createdAt: territories.createdAt,
          })
          .from(territories)
          .where(eq(territories.orgId, orgId))
          .orderBy(territories.name)
          .limit(limit),
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const { name, states, cities, assignedReps, description, isActive } = await parseBody(req, createSchema);

    const [created] = await db
      .insert(territories)
      .values({
        orgId: session.orgId,
        name,
        states,
        cities,
        assignedReps,
        description: description ?? null,
        isActive,
        createdBy: session.user.id,
      })
      .returning();

    await invalidateCachePattern(`crm:territories:${session.orgId}:*`);

    return ok(created, 201);
  });
}
