import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { automationRules, automationRuns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { testAutomationSchema } from "@/lib/services/automation/validation";
import { runRule } from "@/lib/services/automation/engine";

type RouteContext = { params: Promise<{ ruleId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "settings:automations", async (session) => {
    const { ruleId: idStr } = await ctx.params;
    const ruleId = Number(idStr);
    if (!Number.isFinite(ruleId)) return err("Invalid rule ID", 400);

    const rule = await db.query.automationRules.findFirst({
      where: and(eq(automationRules.id, ruleId), eq(automationRules.orgId, session.orgId)),
      columns: { id: true, triggerEvent: true, conditions: true, actions: true },
    });
    if (!rule) return err("Automation not found", 404);

    const { payload } = await parseBody(req, testAutomationSchema);

    const { matched, actionResults } = await runRule(
      session.orgId,
      { id: rule.id, conditions: rule.conditions, actions: rule.actions },
      rule.triggerEvent,
      payload,
    );

    const failures = actionResults.filter((r) => !r.ok);
    const status = !matched ? "skipped" : failures.length === 0 ? "success" : "failed";

    const [run] = await db
      .insert(automationRuns)
      .values({
        orgId: session.orgId,
        ruleId: rule.id,
        triggerEvent: rule.triggerEvent,
        status,
        payload,
        result: { matched, actionResults, test: true },
        error: failures.length > 0 ? failures.map((f) => `${f.type}: ${f.error}`).join("; ") : null,
      })
      .returning({ id: automationRuns.id });

    return ok({ runId: run.id, matched, status, actionResults });
  });
}
