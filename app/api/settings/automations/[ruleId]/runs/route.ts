import { type NextRequest } from "next/server";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { automationRules, automationRuns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

type RouteContext = { params: Promise<{ ruleId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "settings:automations", async (session) => {
    const { ruleId: idStr } = await ctx.params;
    const ruleId = Number(idStr);
    if (!Number.isFinite(ruleId)) return err("Invalid rule ID", 400);

    const rule = await db.query.automationRules.findFirst({
      where: and(eq(automationRules.id, ruleId), eq(automationRules.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!rule) return err("Automation not found", 404);

    const runs = await db
      .select({
        id: automationRuns.id,
        triggerEvent: automationRuns.triggerEvent,
        status: automationRuns.status,
        payload: automationRuns.payload,
        result: automationRuns.result,
        error: automationRuns.error,
        createdAt: automationRuns.createdAt,
      })
      .from(automationRuns)
      .where(and(eq(automationRuns.ruleId, ruleId), eq(automationRuns.orgId, session.orgId)))
      .orderBy(desc(automationRuns.createdAt))
      .limit(50);

    return ok(runs);
  });
}
