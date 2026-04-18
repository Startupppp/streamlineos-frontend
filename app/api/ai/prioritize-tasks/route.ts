import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { isOpenAIConfigured, aiInvoke } from "@/lib/ai/openai";
import { db } from "@/lib/db";
import { tasks, leads, crmDeals } from "@/lib/db/schema/crm";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { differenceInHours } from "date-fns";


const PriorityItemSchema = z.object({
  taskId: z.number(),
  rank: z.number(),
  urgencyScore: z.number().min(0).max(100),
  reasoning: z.string(),
});

const PriorityResponseSchema = z.object({
  items: z.array(PriorityItemSchema),
  summary: z.string(),
});

export type PriorityItem = z.infer<typeof PriorityItemSchema>;
export type PriorityResponse = z.infer<typeof PriorityResponseSchema>;


export async function GET(req: NextRequest) {
  void req;
  return withAuth<PriorityResponse>(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI is not configured. Set OPENAI_API_KEY.", 503);
    }

    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.orgId, session.orgId),
          eq(tasks.assigneeId, session.user.id),
          eq(tasks.status, "pending"),
          isNull(tasks.completedAt),
        ),
      )
      .limit(30);

    if (pendingTasks.length === 0) {
      return ok({ items: [], summary: "No pending tasks to prioritize." });
    }

    const enriched = await Promise.all(
      pendingTasks.map(async (t) => {
        let entityContext: Record<string, unknown> = {};

        if (t.entityType === "LEAD" && t.entityId) {
          const [lead] = await db
            .select({
              id: leads.id,
              name: leads.name,
              score: leads.score,
              potentialValue: leads.potentialValue,
              slaDeadline: leads.slaDeadline,
              status: leads.status,
              priority: leads.priority,
            })
            .from(leads)
            .where(and(eq(leads.id, t.entityId), eq(leads.orgId, session.orgId)))
            .limit(1);

          if (lead) {
            const slaHoursLeft = lead.slaDeadline
              ? differenceInHours(new Date(lead.slaDeadline), new Date())
              : null;
            entityContext = {
              type: "LEAD",
              name: lead.name,
              score: lead.score ?? 0,
              potentialValue: lead.potentialValue ? parseFloat(String(lead.potentialValue)) : 0,
              slaHoursLeft,
              slaMissed: slaHoursLeft !== null && slaHoursLeft < 0,
              priority: lead.priority,
              status: lead.status,
            };
          }
        } else if (t.entityType === "DEAL" && t.entityId) {
          const [deal] = await db
            .select({
              id: crmDeals.id,
              companyName: crmDeals.companyName,
              value: crmDeals.value,
              stage: crmDeals.stage,
              closeDate: crmDeals.closeDate,
            })
            .from(crmDeals)
            .where(and(eq(crmDeals.id, t.entityId), eq(crmDeals.orgId, session.orgId)))
            .limit(1);

          if (deal) {
            const closeDaysLeft = deal.closeDate
              ? differenceInHours(new Date(deal.closeDate), new Date()) / 24
              : null;
            entityContext = {
              type: "DEAL",
              companyName: deal.companyName,
              value: deal.value ? parseFloat(String(deal.value)) : 0,
              stage: deal.stage,
              closeDaysLeft: closeDaysLeft !== null ? Math.round(closeDaysLeft) : null,
            };
          }
        }

        const dueHoursLeft = t.dueDate
          ? differenceInHours(new Date(t.dueDate), new Date())
          : null;

        return {
          taskId: t.id,
          title: t.title,
          type: t.type,
          notes: t.notes,
          dueHoursLeft,
          overdue: dueHoursLeft !== null && dueHoursLeft < 0,
          entityContext,
        };
      }),
    );

    const taskListJson = JSON.stringify(enriched, null, 2);

    const result = await aiInvoke({
      model: "fast",
      schema: PriorityResponseSchema,
      schemaName: "task_priority",
      system: `You are a sales productivity assistant. Your job is to rank a sales rep's pending tasks by urgency and business impact.

Ranking criteria (in order of importance):
1. SLA breaches — tasks tied to leads with an overdue SLA MUST be ranked highest
2. Overdue tasks — tasks past their due date
3. Lead score + potential value — higher score / value = higher priority
4. Due soon — tasks due within 24h rank above those due in 3+ days
5. Deal close date proximity — tasks for deals closing soon rank higher
6. Task type — CALL > MEETING > EMAIL > CUSTOM when all else is equal

For each task return:
- taskId (exact integer from input)
- rank (1 = highest priority)
- urgencyScore (0–100, where 100 = "do this right now")
- reasoning (1-2 sentences explaining why this rank)

Also return a short summary (2-3 sentences) with overall advice for the rep.`,
      user: `Here are my ${enriched.length} pending tasks. Please prioritize them:\n\n${taskListJson}`,
    });

    return ok(result);
  });
}
