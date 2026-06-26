import { withAuth, ok, err, parseBody } from "@/lib/api/helpers"; 
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { performanceImprovementPlans } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1),
  hrRepId: z.string().optional(),
  reason: z.string().min(1).max(1000),
  objectives: z.array(z.object({
    objective: z.string().min(1),
    metric: z.string().min(1),
    deadline: z.string().min(1),
  })).min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    const isAdmin = ability.can("manage", "hr:performance");
    const conditions = [eq(performanceImprovementPlans.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(performanceImprovementPlans.userId, session.user.id));

    const data = await db.query.performanceImprovementPlans.findMany({
      where: and(...conditions),
      with: { user: true, manager: true, hrRep: true },
      orderBy: [desc(performanceImprovementPlans.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:performance"))  return err("Only admins can create PIPs.", 403);
    const body = await parseBody(req, createSchema);
    const [pip] = await db.insert(performanceImprovementPlans).values({
      orgId: session.orgId,
      userId: body.userId,
      managerId: session.user.id,
      hrRepId: body.hrRepId || null,
      reason: body.reason,
      objectives: body.objectives,
      startDate: body.startDate,
      endDate: body.endDate,
      notes: body.notes,
      status: "ACTIVE",
    }).returning();
    return ok(pip, 201);
  });
}
