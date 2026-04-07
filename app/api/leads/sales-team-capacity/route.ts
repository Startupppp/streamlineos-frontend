import { withAuth, ok } from "@/lib/api/helpers";
import { getSalesTeamCapacity } from "@/server/queries/leads-analytics";

/** GET /api/leads/sales-team-capacity — Sales rep active lead counts */
export async function GET() {
  return withAuth(async (session) => {
    const data = await getSalesTeamCapacity(session.orgId);
    return ok(data);
  });
}
