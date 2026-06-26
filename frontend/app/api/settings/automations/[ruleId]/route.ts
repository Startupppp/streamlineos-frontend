import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { automationRules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateAutomationSchema } from "@/lib/services/automation/validation";

type RouteContext = { params: Promise<{ ruleId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "settings:automations", async (session) => {
    const { ruleId: idStr } = await ctx.params;
    const ruleId = Number(idStr);
    if (!Number.isFinite(ruleId)) return err("Invalid rule ID", 400);

    const rule = await db.query.automationRules.findFirst({
      where: and(eq(automationRules.id, ruleId), eq(automationRules.orgId, session.orgId)),
    });

    if (!rule) return err("Automation not found", 404);
    return ok(rule);
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "settings:automations", async (session) => {
    const { ruleId: idStr } = await ctx.params;
    const ruleId = Number(idStr);
    if (!Number.isFinite(ruleId)) return err("Invalid rule ID", 400);

    const input = await parseBody(req, updateAutomationSchema);

    const [updated] = await db
      .update(automationRules)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.triggerEvent !== undefined ? { triggerEvent: input.triggerEvent } : {}),
        ...(input.conditions !== undefined ? { conditions: input.conditions } : {}),
        ...(input.actions !== undefined ? { actions: input.actions } : {}),
        ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(automationRules.id, ruleId), eq(automationRules.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Automation not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "settings:automations", async (session) => {
    const { ruleId: idStr } = await ctx.params;
    const ruleId = Number(idStr);
    if (!Number.isFinite(ruleId)) return err("Invalid rule ID", 400);

    const [deleted] = await db
      .delete(automationRules)
      .where(and(eq(automationRules.id, ruleId), eq(automationRules.orgId, session.orgId)))
      .returning({ id: automationRules.id });

    if (!deleted) return err("Automation not found", 404);
    return ok({ success: true });
  });
}
