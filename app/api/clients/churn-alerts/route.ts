import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

/** GET /api/clients/churn-alerts — List at-risk and critical clients */
export async function GET() {
  return withAuth(async (session) => {
    const atRiskClients = await db
      .select({
        id: clients.id,
        name: clients.name,
        company: clients.company,
        healthScore: clients.healthScore,
        healthStatus: clients.healthStatus,
        churnRiskScore: clients.churnRiskScore,
        churnRiskReasoning: clients.churnRiskReasoning,
        lastHealthCheck: clients.lastHealthCheck,
        investmentValue: clients.investmentValue,
        accountManagerId: clients.accountManagerId,
        accountManagerName: users.name,
      })
      .from(clients)
      .leftJoin(users, eq(clients.accountManagerId, users.id))
      .where(
        and(
          eq(clients.orgId, session.orgId),
          or(
            eq(clients.healthStatus, "at_risk"),
            eq(clients.healthStatus, "critical"),
          ),
        ),
      )
      .orderBy(desc(clients.churnRiskScore))
      .limit(20);

    const critical = atRiskClients.filter(c => c.healthStatus === "critical").length;
    const atRisk = atRiskClients.filter(c => c.healthStatus === "at_risk").length;

    return ok({
      alerts: atRiskClients,
      summary: { critical, atRisk, total: atRiskClients.length },
    });
  });
}
