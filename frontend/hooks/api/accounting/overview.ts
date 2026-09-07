"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useCan } from "@/hooks/api/access";
import { overviewContract } from "@/hooks/api/accounting/overview-schema";

export interface BankAccountSummary {
  id: number;
  name: string;
  balance: string;
}

export interface DrillLink {
  type: string;
  params: Record<string, string>;
}

export interface AccountingOverview {
  cashBalance: string;
  bankAccounts: BankAccountSummary[];
  revenueThisMonth: string;
  expensesThisMonth: string;
  netProfit: string;
  taxPayable: string;
  arOverdue: { count: number; amount: string };
  apDueNext7: { count: number; amount: string };
  burnRate: string;
  runwayMonths: number | null;
  reconciliationGaps: number;
  openApprovals: number;
  monthlyTrend: Array<{ month: string; revenue: string; expenses: string }>;
  drill: Record<string, DrillLink>;
  period: { from: string; to: string };
}

export interface OverviewParams {
  from?: string;
  to?: string;
}

function toQuery(params: OverviewParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.from) out.from = params.from;
  if (params.to) out.to = params.to;
  return out;
}

export function useAccountingOverview(params: OverviewParams = {}) {
  const can = useCan("accounting:reports:read");
  return useQuery<AccountingOverview, Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "overview", params],
    queryFn: ({ signal }) =>
      apiClient.get("/accounting/overview", toQuery(params), signal, overviewContract),
    staleTime: 60_000,
    enabled: can,
  });
}
