/**
 * The commission wire shapes, as `crm/commission` and `crm/commission/accrual`
 * actually return them.
 *
 * Every sum of money here is integer minor units and every rate is basis points
 * of 10000, because that is what the backend stores and what it arithmetic is
 * done in. Nothing in this file is a float, and nothing downstream should turn
 * one of these into a float before it is formatted for display — the whole point
 * of the module is that a rep can add the parts up by hand and get the total.
 */

export type CommissionEarningStatus = "CALCULATED" | "APPROVED" | "PAID" | "VOID";

export type CommissionPeriod = "MONTH" | "QUARTER" | "YEAR";

export interface CommissionPlanSummary {
  planId: string;
  name: string;
  description: string | null;
  currency: string;
  /** Set once the plan stops being assignable. Past earnings keep their rules. */
  retiredOn: string | null;
  createdAt: string;
}

export interface CommissionEarning {
  earningId: string;
  orgId: string;
  planId: string;
  planVersionId: string;
  userId: string;
  earnedOn: string;
  periodStart: string;
  periodEnd: string;
  sourceType: string;
  sourceId: string;
  basisMinor: number;
  priorBasisMinor: number | null;
  amountMinor: number;
  currency: string;
  effectiveRateBps: number;
  attainmentBps: number | null;
  /** The stored working. Opaque here; the accrual routes decompose it properly. */
  computation: Record<string, unknown> | null;
  status: CommissionEarningStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One band of one plan version, and what it paid. */
export interface CommissionRuleContribution {
  tierIndex: number;
  tierFrom: number;
  rateBps: number;
  /** 10000 = 1x. An accelerator that never applied still reports 10000. */
  multiplierBps: number;
  basisMinor: number;
  amountMinor: number;
  partCount: number;
}

/** One deal's contribution to an accrual, and the rules behind it. */
export interface CommissionDealContribution {
  sourceType: string;
  sourceId: string;
  dealName: string | null;
  earningId: string;
  planId: string;
  planVersionId: string;
  earnedOn: string;
  basisMinor: number;
  amountMinor: number;
  rules: CommissionRuleContribution[];
}

/**
 * A period's accrued figure with the parts that produced it.
 *
 * `reconciles` is the backend asserting, in the payload, that both roll-ups are
 * integer sums of the same rows as the headline. The UI surfaces it rather than
 * trusting it: a false here means the itemisation was truncated or something
 * upstream stored a decomposition that does not add up, and a rep reading their
 * own number deserves to be told which.
 */
export interface CommissionAccrual {
  userId: string;
  planId: string;
  periodStart: string;
  periodEnd: string;
  period: CommissionPeriod;
  asOf: string;
  amountMinor: number;
  basisMinor: number;
  currency: string;
  attainmentBps: number | null;
  dealCount: number;
  partCount: number;
  itemisedPartCount: number;
  /** True means `deals` and `rules` are a page of the period, not the period. */
  truncated: boolean;
  deals: CommissionDealContribution[];
  rules: CommissionRuleContribution[];
  reconciles: {
    byDeal: boolean;
    byRule: boolean;
  };
}

export interface CommissionAccrualCurvePoint {
  on: string;
  amountMinor: number;
  cumulativeAmountMinor: number;
}

export interface ListEarningsParams {
  userId?: string;
  planId?: string;
  status?: CommissionEarningStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AccrualParams {
  userId?: string;
  planId?: string;
  /** Any date inside the period. The plan version decides how long that is. */
  on?: string;
}
