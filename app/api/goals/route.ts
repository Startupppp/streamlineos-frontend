import { type NextRequest } from "next/server";
import { withAbility, ok, parseQuery, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { okrGoals, okrKeyResults } from "@/lib/db/schema";
import { and, eq, desc, ilike, count } from "drizzle-orm";
import { z } from "zod";

const listSchema = z.object({
  status: z.enum(["not_started", "on_track", "at_risk", "off_track", "completed"]).optional(),
  level: z.enum(["company", "team", "individual"]).optional(),
  ownerId: z.string().optional(),
  projectId: z.coerce.number().int().optional(),
  search: z.string().optional(),
});

const keyResultInputSchema = z.object({
  title: z.string().min(1).max(200),
  metricType: z.enum(["number", "percentage", "currency", "boolean"]).default("number"),
  startValue: z.number().default(0),
  targetValue: z.number(),
  currentValue: z.number().default(0),
  unit: z.string().max(50).optional(),
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  ownerId: z.string().optional(),
  level: z.enum(["company", "team", "individual"]).default("company"),
  status: z.enum(["not_started", "on_track", "at_risk", "off_track", "completed"]).default("not_started"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  parentGoalId: z.number().int().optional(),
  projectId: z.number().int().optional(),
  keyResults: z.array(keyResultInputSchema).optional(),
});

export async function GET(req: NextRequest) {
  return withAbility("view", "projects:goals", async (session) => {
    const filters = parseQuery(req, listSchema);

    const conditions = [eq(okrGoals.orgId, session.orgId)];
    if (filters.status) conditions.push(eq(okrGoals.status, filters.status));
    if (filters.level) conditions.push(eq(okrGoals.level, filters.level));
    if (filters.ownerId) conditions.push(eq(okrGoals.ownerId, filters.ownerId));
    if (filters.projectId !== undefined) conditions.push(eq(okrGoals.projectId, filters.projectId));
    if (filters.search) conditions.push(ilike(okrGoals.title, `%${filters.search}%`));

    const goals = await db.query.okrGoals.findMany({
      where: and(...conditions),
      orderBy: [desc(okrGoals.createdAt)],
      with: {
        owner: { columns: { id: true, name: true, email: true, image: true } },
      },
    });

    const counts = await db
      .select({ goalId: okrKeyResults.goalId, total: count() })
      .from(okrKeyResults)
      .where(eq(okrKeyResults.orgId, session.orgId))
      .groupBy(okrKeyResults.goalId);

    const countMap = new Map(counts.map((c) => [c.goalId, c.total]));

    const result = goals.map((goal) => ({
      ...goal,
      keyResultCount: countMap.get(goal.id) ?? 0,
    }));

    return ok(result);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "projects:goals", async (session) => {
    const input = await parseBody(req, createSchema);

    const goal = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(okrGoals)
        .values({
          orgId: session.orgId,
          title: input.title,
          description: input.description ?? null,
          ownerId: input.ownerId ?? null,
          level: input.level,
          status: input.status,
          startDate: input.startDate ?? null,
          dueDate: input.dueDate ?? null,
          parentGoalId: input.parentGoalId ?? null,
          projectId: input.projectId ?? null,
          createdBy: session.user.id,
        })
        .returning();

      if (input.keyResults && input.keyResults.length > 0) {
        await tx.insert(okrKeyResults).values(
          input.keyResults.map((kr) => ({
            orgId: session.orgId,
            goalId: created.id,
            title: kr.title,
            metricType: kr.metricType,
            startValue: kr.startValue.toString(),
            targetValue: kr.targetValue.toString(),
            currentValue: kr.currentValue.toString(),
            unit: kr.unit ?? null,
          })),
        );
      }

      return created;
    });

    return ok(goal, 201);
  });
}
