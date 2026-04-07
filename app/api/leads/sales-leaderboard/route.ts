import { withAuth, ok } from "@/lib/api/helpers";
import { getSalesLeaderboard } from "@/server/queries/leads-analytics";

/** GET /api/leads/sales-leaderboard — Top performing sales reps */
export async function GET() {
  return withAuth(async (session) => {
    const data = await getSalesLeaderboard(session.orgId);
    return ok(data);
  });
}
