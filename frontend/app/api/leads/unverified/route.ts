import { withAbility, ok } from "@/lib/api/helpers";
import { getUnverifiedLeads } from "@/server/queries/leads";

export async function GET() {
  return withAbility("read", "crm:leads", async (session) => {
    const data = await getUnverifiedLeads(session.orgId!);
    return ok(data);
  });
}
