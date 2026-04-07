import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmCampaigns } from "@/lib/db/schema";
import { eq, count, sum } from "drizzle-orm";

/** GET /api/dm/campaigns/stats — DM campaign aggregations */
export async function GET() {
  return withAuth(async (session) => {
    const [agg] = await db
      .select({
        total: count(),
        totalLeads: sum(crmCampaigns.leads),
        totalSpend: sum(crmCampaigns.spend),
      })
      .from(crmCampaigns)
      .where(eq(crmCampaigns.orgId, session.orgId));

    return ok({
      total: agg?.total ?? 0,
      totalLeads: Number(agg?.totalLeads ?? 0),
      totalSpend: Number(agg?.totalSpend ?? 0),
    });
  });
}
