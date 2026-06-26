import { type NextRequest } from "next/server";
import { withAbility, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { supportRoutingRules } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

const conditionSchema = z.object({
  field: z.string().trim().min(1).max(50),
  op: z.enum(["eq", "neq", "contains"]),
  value: z.string().trim().min(1).max(200),
});

const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  conditions: z.array(conditionSchema).min(1, "At least one condition is required"),
  assigneeId: z.string().trim().min(1).optional(),
  setPriority: prioritySchema.optional(),
  isEnabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export async function GET() {
  return withAbility("view", "support:macros", async (session) => {
    const rules = await db.query.supportRoutingRules.findMany({
      where: eq(supportRoutingRules.orgId, session.orgId),
      orderBy: [asc(supportRoutingRules.sortOrder), asc(supportRoutingRules.id)],
    });

    return ok(rules);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "support:macros", async (session) => {
    const input = await parseBody(req, createSchema);

    const [rule] = await db
      .insert(supportRoutingRules)
      .values({
        orgId: session.orgId,
        name: input.name,
        conditions: input.conditions,
        assigneeId: input.assigneeId ?? null,
        setPriority: input.setPriority ?? null,
        isEnabled: input.isEnabled,
        sortOrder: input.sortOrder,
        createdBy: session.user.id,
      })
      .returning();

    return ok(rule, 201);
  });
}
