import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getIncentiveConfigs } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { incentiveConfig } from "@/lib/db/schema/crm";
import type { NextRequest } from "next/server";
import { z } from "zod";

const createIncentiveConfigSchema = z.object({
  incentiveRate: z.string(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await getIncentiveConfigs(session.orgId);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
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

    return ok(config);
  });
}
