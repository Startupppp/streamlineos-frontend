"use client";

import { useQuery } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useCan } from "@/hooks/api/access";

const reportsOverviewC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.reportsOverviewResponseContract),
);
const reportsUtilizationC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.reportsUtilizationResponseContract),
);
const clientProfitabilityC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.clientProfitabilityResponseContract),
);
const complianceC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.complianceResponseContract),
);
const approvalSlaC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.approvalSlaResponseContract),
);
const billingLeakageC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.billingLeakageResponseContract),
);
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
    queryKey: usersAndCommerceQueryKeys.timesheets.reportsOverview(params),
    queryFn: ({ signal }) => apiClient.get<ReportOverview>("/timesheets/reports/overview", params, signal, reportsOverviewC),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}

export function useUtilizationReport(query: ReportRangeParams = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate };
  return useGatedQuery("timesheets:reports:view", {
    queryKey: usersAndCommerceQueryKeys.timesheets.report("utilization", params),
    queryFn: ({ signal }) => apiClient.get<UtilizationReport>("/timesheets/reports/utilization", params, signal, reportsUtilizationC),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useClientProfitabilityReport(query: ReportRangeParams = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate };
  return useGatedQuery("timesheets:reports:view", {
    queryKey: usersAndCommerceQueryKeys.timesheets.report("client-profitability", params),
    queryFn: ({ signal }) =>
      apiClient.get<ClientProfitabilityReport>("/timesheets/reports/client-profitability", params, signal, clientProfitabilityC),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useComplianceReport(query: ReportRangeParams = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate };
  return useGatedQuery("timesheets:reports:view", {
    queryKey: usersAndCommerceQueryKeys.timesheets.report("compliance", params),
    queryFn: ({ signal }) => apiClient.get<ComplianceReport>("/timesheets/reports/compliance", params, signal, complianceC),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useApprovalSlaReport(query: ReportRangeParams = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate };
  return useGatedQuery("timesheets:reports:view", {
    queryKey: usersAndCommerceQueryKeys.timesheets.report("approval-sla", params),
    queryFn: ({ signal }) => apiClient.get<ApprovalSlaReport>("/timesheets/reports/approval-sla", params, signal, approvalSlaC),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useBillingLeakageReport(query: ReportRangeParams = {}, enabled = true) {
  const params = { startDate: query.startDate, endDate: query.endDate };
  return useGatedQuery("timesheets:reports:view", {
    queryKey: usersAndCommerceQueryKeys.timesheets.report("billing-leakage", params),
    queryFn: ({ signal }) => apiClient.get<BillingLeakageReport>("/timesheets/reports/billing-leakage", params, signal, billingLeakageC),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}
