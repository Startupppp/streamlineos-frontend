import { withAbility, ok } from "@/lib/api/helpers";
import { getLatestHealthScores } from "@/lib/services/cs-health";

export async function GET() {
  return withAbility("read", "crm:clients", async (session) => {
    const data = await getLatestHealthScores(session.orgId);
    return ok(data);
  });
}
