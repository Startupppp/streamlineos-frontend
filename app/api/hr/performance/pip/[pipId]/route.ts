import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { performanceImprovementPlans } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "EXTENDED", "COMPLETED", "TERMINATED"]).optional(),
  outcome: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  endDate: z.string().optional(),
  reason: z.string().min(1).max(1000).optional(),
  objectives: z.array(z.object({
    objective: z.string().min(1),
    metric: z.string().min(1),
    deadline: z.string().min(1),
  })).optional(),
  hrRepId: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pipId: string }> }
) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:performance"))  return err("Forbidden.", 403);
    const { pipId: id } = await params;
    const pipId = Number(id);
    if (!pipId) return err("Invalid ID.", 400);

    const body = updateSchema.parse(await req.json());
    await db.update(performanceImprovementPlans).set({
      ...body,
      updatedAt: new Date(),
    }).where(and(eq(performanceImprovementPlans.id, pipId), eq(performanceImprovementPlans.orgId, session.orgId)));

    return ok({ success: true });
  });
}
