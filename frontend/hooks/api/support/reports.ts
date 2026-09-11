"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useGatedQuery } from "@/hooks/api/gated-query";

const supportOverviewC = lazyContract(() =>
  import("./support-report-schema").then((m) => m.supportOverviewContract),
);
const agentPerformanceListC = lazyContract(() =>
  import("./support-report-schema").then((m) => m.agentPerformanceListContract),
);
const queuePerformanceListC = lazyContract(() =>
  import("./support-report-schema").then((m) => m.queuePerformanceListContract),
);
const channelPerformanceListC = lazyContract(() =>
  import("./support-report-schema").then((m) => m.channelPerformanceListContract),
);
const automationPerformanceListC = lazyContract(() =>
  import("./support-report-schema").then((m) => m.automationPerformanceListContract),
);

export interface SupportReportFilters {
  dateFrom?: string;
  dateTo?: string;
  agentId?: string;
  queueId?: number;
  channel?: string;
}

export interface SupportOverviewReport {
  newTickets: number;
  openTickets: number;
  backlog: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  slaBreachCount: number;
  slaCompliancePct: number | null;
  reopenRate: number;
  ticketsByChannel: { channel: string; count: number }[];
  ticketsByPriority: { priority: string; count: number }[];
  ticketsByCategory: { category: string; count: number }[];
}

export interface AgentPerformanceRow {
  agentId: string | null;
  ticketsHandled: number;
  ticketsResolved: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

export interface QueuePerformanceRow {
  queueId: number | null;
  queueName: string | null;
  ticketsHandled: number;
  openTickets: number;
  avgResolutionMinutes: number | null;
}

export interface ChannelPerformanceRow {
  channel: string;
  ticketsHandled: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

export interface AutomationPerformanceRow {
  ruleId: number | null;
  ruleName: string;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

function toQueryParams(filters?: SupportReportFilters): Record<string, unknown> | undefined {
  if (!filters) return undefined;
  const { dateFrom, dateTo, agentId, queueId, channel } = filters;
  return { dateFrom, dateTo, agentId, queueId, channel };
}

export function useSupportOverviewReport(filters?: SupportReportFilters) {
  return useGatedQuery("support:reports:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportReports.overview(toQueryParams(filters)),
    queryFn: ({ signal }) =>
      apiClient.get<SupportOverviewReport>("/support/reports/overview", toQueryParams(filters), signal, supportOverviewC),
    staleTime: 60_000,
  });
}

export function useAgentPerformanceReport(filters?: SupportReportFilters) {
  return useGatedQuery("support:reports:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportReports.agentPerformance(toQueryParams(filters)),
    queryFn: ({ signal }) =>
      apiClient.get<AgentPerformanceRow[]>(
        "/support/reports/agent-performance",
        toQueryParams(filters), signal, agentPerformanceListC,
      ),
    staleTime: 60_000,
  });
}

export function useQueuePerformanceReport(filters?: SupportReportFilters) {
  return useGatedQuery("support:reports:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportReports.queuePerformance(toQueryParams(filters)),
    queryFn: ({ signal }) =>
      apiClient.get<QueuePerformanceRow[]>(
        "/support/reports/queue-performance",
        toQueryParams(filters), signal, queuePerformanceListC,
      ),
    staleTime: 60_000,
  });
}

export function useChannelPerformanceReport(filters?: SupportReportFilters) {
  return useGatedQuery("support:reports:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportReports.channelPerformance(toQueryParams(filters)),
    queryFn: ({ signal }) =>
      apiClient.get<ChannelPerformanceRow[]>(
        "/support/reports/channel-performance",
        toQueryParams(filters), signal, channelPerformanceListC,
      ),
    staleTime: 60_000,
  });
}

export function useAutomationPerformanceReport(filters?: SupportReportFilters) {
  return useGatedQuery("support:reports:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportReports.automationPerformance(toQueryParams(filters)),
    queryFn: ({ signal }) =>
      apiClient.get<AutomationPerformanceRow[]>(
        "/support/reports/automation-performance",
        toQueryParams(filters), signal, automationPerformanceListC,
      ),
    staleTime: 60_000,
  });
}
