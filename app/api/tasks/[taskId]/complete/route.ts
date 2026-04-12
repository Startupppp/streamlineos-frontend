import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tasks, crmActivities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { addDays, addWeeks, addMonths } from "date-fns";

const bodySchema = z.object({
  completedAt: z.string().datetime({ offset: true }).optional(),
});

type RouteContext = { params: Promise<{ taskId: string }> };

/** POST /api/tasks/[taskId]/complete — mark done + log to activity timeline */
export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { taskId: taskIdStr } = await ctx.params;
    const taskId = Number(taskIdStr);
    if (!Number.isFinite(taskId)) return err("Invalid task ID", 400);

    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.orgId, session.orgId)))
      .limit(1);

    if (!existing) return err("Task not found", 404);
    if (existing.status === "completed") return ok(existing);

    const body = await parseBody(req, bodySchema).catch(() => ({})) as { completedAt?: string };
    const completedAt = body.completedAt ? new Date(body.completedAt) : new Date();

    const [updated] = await db
      .update(tasks)
      .set({
        status: "completed",
        completedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Failed to complete task", 500);

    // ── Log to crm_activities timeline ────────────────────────────────────────
    type CrmActivityType = "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation";
    const typeToActivity: Partial<Record<string, CrmActivityType>> = {
      CALL: "call",
      EMAIL: "email",
      MEETING: "meeting",
    };
    const activityType: CrmActivityType = typeToActivity[existing.type] ?? "deal_won";

    await db.insert(crmActivities).values({
      orgId: session.orgId,
      type: activityType,
      message: `Task completed: ${existing.title}`,
      time: completedAt.toISOString(),
      category: "sales",
    });

    // ── Auto-regenerate recurring task ────────────────────────────────────────
    const recurrence = existing.recurrence as {
      frequency: "DAILY" | "WEEKLY" | "MONTHLY";
      interval: number;
      endDate?: string;
    } | null;

    if (recurrence && existing.dueDate) {
      const prevDue = new Date(existing.dueDate);
      const interval = recurrence.interval ?? 1;
      let nextDue: Date;

      if (recurrence.frequency === "DAILY") {
        nextDue = addDays(prevDue, interval);
      } else if (recurrence.frequency === "WEEKLY") {
        nextDue = addWeeks(prevDue, interval);
      } else {
        nextDue = addMonths(prevDue, interval);
      }

      const endDate = recurrence.endDate ? new Date(recurrence.endDate) : null;
      const withinRange = !endDate || nextDue <= endDate;

      if (withinRange) {
        await db.insert(tasks).values({
          orgId: session.orgId,
          title: existing.title,
          notes: existing.notes,
          entityType: existing.entityType,
          entityId: existing.entityId,
          type: existing.type,
          status: "pending",
          assigneeId: existing.assigneeId,
          createdBy: existing.createdBy,
          dueDate: nextDue,
          remindAt: existing.remindAt,
          timezone: existing.timezone,
          recurrence: existing.recurrence,
          parentTaskId: existing.id,
        });
      }
    }

    return ok(updated);
  });
}
