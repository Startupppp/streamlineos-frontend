import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const schema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1).max(500),
  assignedToId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const { leadIds, assignedToId } = await parseBody(req, schema);

    const result = await db
      .update(leads)
      .set({
        status: "CONTACTED",
        assignedToId: assignedToId ?? session.user.id,
        assignedById: session.user.id,
        assignedAt: new Date(),
      })
      .where(and(eq(leads.orgId, session.orgId), inArray(leads.id, leadIds)))
      .returning({ id: leads.id });

    return ok({ updated: result.length });
  });
}
