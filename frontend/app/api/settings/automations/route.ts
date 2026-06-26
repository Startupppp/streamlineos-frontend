import { type NextRequest } from "next/server";
import { withAbility, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { automationRules } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createAutomationSchema } from "@/lib/services/automation/validation";

export async function GET() {
  return withAbility("view", "settings:automations", async (session) => {
    const rules = await db
      .select({
        id: automationRules.id,
        name: automationRules.name,
        description: automationRules.description,
        triggerEvent: automationRules.triggerEvent,
        conditions: automationRules.conditions,
        actions: automationRules.actions,
        isEnabled: automationRules.isEnabled,
        runCount: automationRules.runCount,
        lastRunAt: automationRules.lastRunAt,
        createdAt: automationRules.createdAt,
        updatedAt: automationRules.updatedAt,
      })
      .from(automationRules)
      .where(eq(automationRules.orgId, session.orgId))
      .orderBy(desc(automationRules.createdAt));

    return ok(rules);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "settings:automations", async (session) => {
    const input = await parseBody(req, createAutomationSchema);

    const [rule] = await db
      .insert(automationRules)
      .values({
        orgId: session.orgId,
        name: input.name,
        description: input.description ?? null,
        triggerEvent: input.triggerEvent,
        conditions: input.conditions,
        actions: input.actions,
        isEnabled: input.isEnabled,
        createdBy: session.user.id,
      })
      .returning();

    return ok(rule, 201);
  });
}
