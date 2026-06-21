import { withAbility, ok } from "@/lib/api/helpers";
import { computeHealthForOrg } from "@/lib/services/cs-health";

export async function POST() {
  return withAbility("update", "crm:clients", async (session) => {
    const results = await computeHealthForOrg(session.orgId);
    const total = results.length;
    const healthy = results.filter((r) => r.status === "healthy").length;
    const atRisk = results.filter((r) => r.status === "at_risk").length;
    const critical = results.filter((r) => r.status === "critical").length;
    const avgScore = total > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / total) : 0;
    return ok({ healthy, atRisk, critical, total, avgScore });
  });
}
