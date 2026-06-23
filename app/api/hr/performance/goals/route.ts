import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getGoals } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createGoalSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(100, "Title must be at most 100 characters").regex(/[a-zA-Z]/, "Title must contain at least one letter"),
  description: z.string().max(1000).optional(),
  type: z.string().optional(),
  targetValue: z.number().min(0, "Target value must be non-negative").max(1000000, "Target value cannot exceed 1,000,000").optional(),
  currentValue: z.number().min(0).optional().default(0),
  unit: z.string().max(50).optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  parentGoalId: z.number().optional(),
}).refine((d) => new Date(d.endDate) > new Date(d.startDate), { message: "End date must be after start date", path: ["endDate"] });

const updateGoalSchema = z.object({
  goalId: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  status: z.string().optional(),
  progress: z.number().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const ability = await getSessionAbility();

    const isAdmin = ability.can("manage", "hr:performance");
    const filterUserId = searchParams.get("userId") ?? undefined;

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized.", 403);
    }

    const data = await getGoals(
      session.orgId,
      session.user.id,
      isAdmin,
      filterUserId
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:performance")) {
      return err("Only admins can create goals.", 403);
    }

    const body = await parseBody(req, createGoalSchema);

    if (!body.userId || !body.title || !body.startDate || !body.endDate) {
      return err("userId, title, startDate, and endDate are required.", 400);
    }

    const [goal] = await db
      .insert(goals)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        title: body.title,
        description: body.description,
        type: body.type,
        targetValue: body.targetValue?.toString(),
        currentValue: (body.currentValue ?? 0).toString(),
        unit: body.unit,
        startDate: formatDateOnly(new Date(body.startDate)),
        endDate: formatDateOnly(new Date(body.endDate)),
        status: "IN_PROGRESS",
        progress: 0,
        parentGoalId: body.parentGoalId,
      })
      .returning();

    return ok(goal);
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:performance")) {
      return err("Only admins can update goals.", 403);
    }

    const body = await parseBody(req, updateGoalSchema);

    if (!body.goalId) return err("goalId is required.", 400);

    await db
      .update(goals)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.targetValue !== undefined && {
          targetValue: body.targetValue.toString(),
        }),
        ...(body.currentValue !== undefined && {
          currentValue: body.currentValue.toString(),
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.progress !== undefined && { progress: body.progress }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(goals.id, body.goalId), eq(goals.orgId, session.orgId))
      );

    return ok({ success: true }, 201);
  });
}
