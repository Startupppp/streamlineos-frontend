"use client";

import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type {
  AccrualParams,
  CommissionAccrual,
  CommissionDealContribution,
  CommissionEarning,
  CommissionPlanSummary,
  CommissionRuleContribution,
  ListEarningsParams,
} from "@/types/crm/commission";

/**
 * Reads of the commission ledger.
 *
 * Every read below is gated on `crm:commission-earnings:view` or
 * `crm:commission-plans:view`, and the accrual reads deliberately share the
 * earnings key rather than taking one of their own — the backend gates them the
 * same way, for the reason spelled out in `commission-accrual.controller.ts`: an
 * accrual is a set of earnings summed, and a key that granted the total while
 * withholding the parts would be permission to see a number nobody could check.
 *
 * Whose rows come back is not decided here. The server narrows by the caller's
 * RBAC scope, so a rep asking for the team's ledger gets their own — passing a
 * `userId` is how a manager at scope `all` names somebody, not how a rep reaches
 * a colleague.
 */

export function useCommissionPlans() {
  return useGatedQuery("crm:commission-plans:view", {
    queryKey: queryKeys.crmCommission.plans(),
    queryFn: ({ signal }) =>
      apiClient.get<CommissionPlanSummary[]>("/crm/commission/plans", undefined, signal),
    staleTime: 5 * 60_000,
  });
}

export function useCommissionEarnings(params?: ListEarningsParams) {
  return useGatedQuery("crm:commission-earnings:view", {
    queryKey: queryKeys.crmCommission.earnings(params),
    queryFn: ({ signal }) => {
      const query: Record<string, string | number> = {};
      if (params?.userId !== undefined) query.userId = params.userId;
      if (params?.planId !== undefined) query.planId = params.planId;
      if (params?.status !== undefined) query.status = params.status;
      if (params?.from !== undefined) query.from = params.from;
      if (params?.to !== undefined) query.to = params.to;
      if (params?.limit !== undefined) query.limit = params.limit;
      if (params?.offset !== undefined) query.offset = params.offset;
      return apiClient.get<CommissionEarning[]>("/crm/commission/earnings", query, signal);
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * The period figure and the parts that produced it.
 *
 * `on` is any date inside the period rather than a period label, because how
 * long a period is belongs to the plan version in force — asking for "2026-03"
 * would mean different spans for two reps on different plans.
 */
export function useCommissionAccrual(params?: AccrualParams) {
  return useGatedQuery("crm:commission-earnings:view", {
    queryKey: queryKeys.crmCommission.accrual(params),
    queryFn: ({ signal }) => {
      const query: Record<string, string> = {};
      if (params?.userId !== undefined) query.userId = params.userId;
      if (params?.planId !== undefined) query.planId = params.planId;
      if (params?.on !== undefined) query.on = params.on;
      return apiClient.get<CommissionAccrual>("/crm/commission/accrual", query, signal);
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/** What one deal paid, to whom, under which band of which version. */
export function useCommissionAccrualByDeal(dealId: number) {
  return useGatedQuery("crm:commission-earnings:view", {
    queryKey: queryKeys.crmCommission.accrualByDeal(String(dealId)),
    queryFn: ({ signal }) =>
      apiClient.get<{
        deals: CommissionDealContribution[];
        rules: CommissionRuleContribution[];
      }>("/crm/commission/accrual/by-deal", { dealId }, signal),
    staleTime: 60_000,
    enabled: dealId > 0,
  });
}

/** One earning taken apart, band by band. 404s for somebody else's. */
export function useCommissionEarningBreakdown(earningId: string) {
  return useGatedQuery("crm:commission-earnings:view", {
    queryKey: queryKeys.crmCommission.earningBreakdown(earningId),
    queryFn: ({ signal }) =>
      apiClient.get<{
        deals: CommissionDealContribution[];
        rules: CommissionRuleContribution[];
      }>(`/crm/commission/accrual/earnings/${earningId}`, undefined, signal),
    staleTime: 60_000,
    enabled: earningId.length > 0,
  });
}

/**
 * Approve a calculated earning for payout.
 *
 * A separate key from the one that defines a plan, so the person who wrote the
 * rate cannot also sign off their own number. The backend 409s on anything that
 * is not `CALCULATED`; the caller surfaces that message rather than retrying.
 */
export function useApproveCommissionEarning() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<CommissionEarning, Error, string>(
    "crm:commission-earnings:approve",
    {
      mutationKey: ["crm", "commission", "earnings", "approve"],
      mutationFn: (earningId, idempotencyKey) =>
        apiClient.post<CommissionEarning>(
          `/crm/commission/earnings/${earningId}/approve`,
          {},
          { headers: { "Idempotency-Key": idempotencyKey } },
        ),
      onSuccess: () => {
        // The accrual is a roll-up of these rows, so it goes stale with them.
        void qc.invalidateQueries({ queryKey: queryKeys.crmCommission.all });
      },
    },
  );
}
