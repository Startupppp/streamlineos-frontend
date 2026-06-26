import { withAuth, ok } from "@/lib/api/helpers";
import { getIncentiveStats } from "@/server/queries/hr";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getIncentiveStats(session.orgId);
    return ok(data);
  });
}
