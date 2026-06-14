import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { supportRoutingRules } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const conditionSchema = z.object({
  field: z.string().trim().min(1).max(50),
  op: z.enum(["eq", "neq", "contains"]),
  value: z.string().trim().min(1).max(200),
});

const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  conditions: z.array(conditionSchema).min(1).optional(),
  assigneeId: z.string().trim().min(1).nullable().optional(),
  setPriority: prioritySchema.nullable().optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

type RouteContext = { params: Promise<{ ruleId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:macros", async (session) => {
    const { ruleId: idStr } = await ctx.params;
    const ruleId = Number(idStr);
    if (!Number.isFinite(ruleId)) return err("Invalid rule ID", 400);

    const input = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(supportRoutingRules)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(supportRoutingRules.id, ruleId), eq(supportRoutingRules.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Routing rule not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:macros", async (session) => {
    const { ruleId: idStr } = await ctx.params;
    const ruleId = Number(idStr);
    if (!Number.isFinite(ruleId)) return err("Invalid rule ID", 400);

    const [deleted] = await db
      .delete(supportRoutingRules)
      .where(and(eq(supportRoutingRules.id, ruleId), eq(supportRoutingRules.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Routing rule not found", 404);
    return ok({ success: true });
  });
}
