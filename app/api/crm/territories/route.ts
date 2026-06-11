import { withAuth, ok, parseQuery, parseBody } from "@/lib/api/helpers";
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
    const rows = await db
      .select()
      .from(territories)
      .where(eq(territories.orgId, session.orgId))
      .orderBy(territories.name)
      .limit(limit);

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

    return ok(created, 201);
  });
}
