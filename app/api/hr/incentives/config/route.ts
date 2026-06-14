import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getIncentiveConfigs } from "@/server/queries/hr";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { incentiveConfig } from "@/lib/db/schema/crm";
import type { NextRequest } from "next/server";
import { z } from "zod";

const createIncentiveConfigSchema = z.object({
  incentiveRate: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z
      .number({ message: "Incentive rate must be a number" })
      .positive({ message: "Incentive rate must be positive" })
      .max(100, { message: "Incentive rate cannot exceed 100%" })
      .multipleOf(0.01, { message: "Incentive rate can have at most 2 decimal places" })
      .transform((n) => n.toFixed(2)),
  ),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await getIncentiveConfigs(session.orgId);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("approve", "crm:incentives")) {
      return err("Only admins can set incentive config.", 403);
    }

    const body = await parseBody(req, createIncentiveConfigSchema);

    const [config] = await db
      .insert(incentiveConfig)
      .values({
        orgId: session.orgId,
        incentiveRate: body.incentiveRate,
        createdBy: session.user.id,
        isActive: true,
      })
      .returning();

    return ok(config, 201);
  });
}
