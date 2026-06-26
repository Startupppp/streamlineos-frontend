import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { dealApprovalRules } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { z } from "zod";

const createSchema = z.object({
  minValue: z.string().min(1, "Minimum value is required"),
  approverRole: z.string().default("CEO"),
});

export async function GET() {
  return withAuth(async (session) => {
    const rules = await db
      .select()
      .from(dealApprovalRules)
      .where(eq(dealApprovalRules.orgId, session.orgId))
      .orderBy(desc(dealApprovalRules.createdAt));
    return ok(rules);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "settings")) return err("Only admins can create approval rules", 403);

    const input = await parseBody(req, createSchema);
    const [rule] = await db.insert(dealApprovalRules).values({
      orgId: session.orgId,
      minValue: input.minValue,
      approverRole: input.approverRole,
    }).returning();

    return ok(rule, 201);
  });
}
