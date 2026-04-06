"server-only";

import { db } from "@/lib/db";
import { commissionRules, commissions, deals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

interface CommissionTier {
  minValue: number;
  maxValue?: number;
  rate: number;
}

/**
 * Calculate and record commission when a deal is marked WON.
 * Call this in the deal stage-change API route.
 */
export async function calculateCommission(
  orgId: string,
  dealId: number,
): Promise<{ amount: number; rate: number } | null> {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.orgId, orgId)));

  if (!deal || !deal.assignedToId) return null;

  const dealValue = Number(deal.value ?? 0);
  if (dealValue <= 0) return null;

  // Find active commission rules
  const rules = await db
    .select()
    .from(commissionRules)
    .where(and(eq(commissionRules.orgId, orgId), eq(commissionRules.isActive, true)));

  if (rules.length === 0) return null;

  // Use the first matching rule
  const rule = rules[0];
  let rate = 0;
  let amount = 0;

  if (rule.type === "flat_percent" && rule.flatRate) {
    rate = Number(rule.flatRate);
    amount = Math.round(dealValue * rate / 100);
  } else if (rule.type === "tiered" && rule.tiers) {
    const tiers = rule.tiers as CommissionTier[];
    for (const tier of tiers) {
      if (dealValue >= tier.minValue && (!tier.maxValue || dealValue <= tier.maxValue)) {
        rate = tier.rate;
        amount = Math.round(dealValue * rate / 100);
        break;
      }
    }
  }

  if (amount <= 0) return null;

  // Record the commission
  await db.insert(commissions).values({
    orgId,
    userId: deal.assignedToId,
    dealId,
    ruleId: rule.id,
    dealValue: String(dealValue),
    commissionRate: String(rate),
    commissionAmount: String(amount),
    status: "pending",
  });

  logger.info(`[commission] Recorded ₹${amount} commission for deal ${dealId} (${rate}%)`);

  return { amount, rate };
}
