import { withAuth, ok } from "@/lib/api/helpers";
import { getDealStats } from "@/server/queries/crm";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getDealStats(session.orgId!);
    return ok(data);
  });
}
