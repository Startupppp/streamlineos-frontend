"use client";

import { useQuery } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { ReportOverview } from "@/features/timesheets/types";
import type {
  ApprovalSlaReport,
  BillingLeakageReport,
  ClientProfitabilityReport,
  ComplianceReport,
  ReportRangeParams,
  UtilizationReport,
} from "@/features/timesheets/reports/reports-types";

interface OverviewQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export function useReportsOverview(query: OverviewQuery = {}, enabled = true) {
  const canView = useCan("timesheets:reports:view");
  const params = { startDate: query.startDate, endDate: query.endDate, userId: query.userId };
  return useQuery({
    queryKey: queryKeys.timesheets.reportsOverview(params),
    queryFn: ({ signal }) => apiClient.get<ReportOverview>("/timesheets/reports/overview", params, signal),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}

export function useUtilizationReport(query: ReportRangeParams = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate };
  return useGatedQuery("timesheets:reports:view", {
    queryKey: queryKeys.timesheets.report("utilization", params),
    queryFn: ({ signal }) => apiClient.get<UtilizationReport>("/timesheets/reports/utilization", params, signal),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useClientProfitabilityReport(query: ReportRangeParams = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate };
  return useGatedQuery("timesheets:reports:view", {
    queryKey: queryKeys.timesheets.report("client-profitability", params),
    queryFn: ({ signal }) =>
      apiClient.get<ClientProfitabilityReport>("/timesheets/reports/client-profitability", params, signal),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useComplianceReport(query: ReportRangeParams = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate };
  return useGatedQuery("timesheets:reports:view", {
    queryKey: queryKeys.timesheets.report("compliance", params),
    queryFn: ({ signal }) => apiClient.get<ComplianceReport>("/timesheets/reports/compliance", params, signal),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useApprovalSlaReport(query: ReportRangeParams = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate };
  return useGatedQuery("timesheets:reports:view", {
    queryKey: queryKeys.timesheets.report("approval-sla", params),
    queryFn: ({ signal }) => apiClient.get<ApprovalSlaReport>("/timesheets/reports/approval-sla", params, signal),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useBillingLeakageReport(query: ReportRangeParams = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate };
  return useGatedQuery("timesheets:reports:view", {
    queryKey: queryKeys.timesheets.report("billing-leakage", params),
    queryFn: ({ signal }) => apiClient.get<BillingLeakageReport>("/timesheets/reports/billing-leakage", params, signal),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}
