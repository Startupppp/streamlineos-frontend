import "server-only";

import { aiJSON, isOpenAIConfigured } from "./openai";
import { churnRiskPrompt, type ChurnRiskInput, type ChurnRiskResult } from "./prompts";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Analyze churn risk for a client using AI.
 * Updates the client record with the risk score and reasoning.
 */
export async function analyzeChurnRisk(
  orgId: string,
  clientId: number,
  context?: { openTickets?: number; ticketsLast90Days?: number; daysSinceLastActivity?: number | null },
): Promise<ChurnRiskResult | null> {
  if (!isOpenAIConfigured()) {
    logger.warn("[ai-churn] OpenAI not configured");
    return null;
  }

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)));

  if (!client) return null;

  const now = new Date();
  const convertedAt = client.convertedAt ? new Date(client.convertedAt) : client.createdAt ? new Date(client.createdAt) : now;
  const daysSinceConversion = Math.floor((now.getTime() - convertedAt.getTime()) / (1000 * 60 * 60 * 24));

  const input: ChurnRiskInput = {
    clientName: client.name,
    company: client.company,
    healthScore: client.healthScore ?? 50,
    investmentValue: client.investmentValue ? Number(client.investmentValue) : null,
    daysSinceLastActivity: context?.daysSinceLastActivity ?? null,
    openTickets: context?.openTickets ?? 0,
    totalTicketsLast90Days: context?.ticketsLast90Days ?? 0,
    accountManagerName: null, // Would need a join to get this
    status: client.status,
    daysSinceConversion,
  };

  const prompt = churnRiskPrompt(input);
  const result = await aiJSON<ChurnRiskResult>({
    model: "fast",
    system: prompt.system,
    user: prompt.user,
    maxTokens: 512,
  });

  result.churnRiskScore = Math.max(0, Math.min(100, Math.round(result.churnRiskScore)));

  // Derive health status from churn risk
  const healthStatus = result.churnRiskScore >= 70 ? "critical"
    : result.churnRiskScore >= 40 ? "at_risk"
    : "healthy";

  const healthScore = Math.max(0, 100 - result.churnRiskScore);

  // Persist to client record
  await db
    .update(clients)
    .set({
      healthScore,
      healthStatus,
      churnRiskScore: result.churnRiskScore,
      churnRiskReasoning: result.reasoning,
      lastHealthCheck: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)));

  return result;
}
