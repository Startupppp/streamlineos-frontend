
export type CommissionEarningStatus = "CALCULATED" | "APPROVED" | "PAID" | "VOID";

export type CommissionPeriod = "MONTH" | "QUARTER" | "YEAR";

export interface CommissionPlanSummary {
  planId: string;
  name: string;
  description: string | null;
  currency: string;
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
  computation: Record<string, unknown> | null;
  status: CommissionEarningStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionRuleContribution {
  tierIndex: number;
  tierFrom: number;
  rateBps: number;
  multiplierBps: number;
  basisMinor: number;
  amountMinor: number;
  partCount: number;
}

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

export type ListEarningsParams = {
  userId?: string;
  planId?: string;
  status?: CommissionEarningStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export type AccrualParams = {
  userId?: string;
  planId?: string;
  on?: string;
};
