"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  agentId: string;
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
  ruleId: number;
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
  return useQuery({
    queryKey: queryKeys.supportReports.overview(toQueryParams(filters)),
    queryFn: () =>
      apiClient.get<SupportOverviewReport>("/support/reports/overview", toQueryParams(filters)),
    staleTime: 60_000,
  });
}

export function useAgentPerformanceReport(filters?: SupportReportFilters) {
  return useQuery({
    queryKey: queryKeys.supportReports.agentPerformance(toQueryParams(filters)),
    queryFn: () =>
      apiClient.get<AgentPerformanceRow[]>(
        "/support/reports/agent-performance",
        toQueryParams(filters),
      ),
    staleTime: 60_000,
  });
}

export function useQueuePerformanceReport(filters?: SupportReportFilters) {
  return useQuery({
    queryKey: queryKeys.supportReports.queuePerformance(toQueryParams(filters)),
    queryFn: () =>
      apiClient.get<QueuePerformanceRow[]>(
        "/support/reports/queue-performance",
        toQueryParams(filters),
      ),
    staleTime: 60_000,
  });
}

export function useChannelPerformanceReport(filters?: SupportReportFilters) {
  return useQuery({
    queryKey: queryKeys.supportReports.channelPerformance(toQueryParams(filters)),
    queryFn: () =>
      apiClient.get<ChannelPerformanceRow[]>(
        "/support/reports/channel-performance",
        toQueryParams(filters),
      ),
    staleTime: 60_000,
  });
}

export function useAutomationPerformanceReport(filters?: SupportReportFilters) {
  return useQuery({
    queryKey: queryKeys.supportReports.automationPerformance(toQueryParams(filters)),
    queryFn: () =>
      apiClient.get<AutomationPerformanceRow[]>(
        "/support/reports/automation-performance",
        toQueryParams(filters),
      ),
    staleTime: 60_000,
  });
}
