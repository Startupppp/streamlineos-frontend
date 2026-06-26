import { withAuth, ok } from "@/lib/api/helpers";
import { getPendingWfhRequests } from "@/server/queries/hr";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getPendingWfhRequests(session.orgId);
    return ok(data);
  });
}
