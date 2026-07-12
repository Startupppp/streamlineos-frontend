"use client";

import { useMemo } from "react";
import {
  useLeadStats,
  useLeads,
  useLeadAnalyticsSummary,
  useSalesLeaderboard,
} from "@/hooks/api/leads";
import { useDeals } from "@/hooks/api/crm";
import { useTaskAnalytics } from "@/hooks/api/tasks";
import { useSlaReport } from "@/hooks/api/crm-settings";
import {
  useSalesDashboardKPIs,
  useRevenueVsGoal,
} from "@/hooks/api/crm/analytics";

export interface FunnelEntry {
  name: string;
  value: number;
  fill: string;
}

export interface LeadVolumeEntry {
  week: string;
  leads: number;
}

export interface SourceEntry {
  name: string;
  value: number;
}

export interface DealStageValueEntry {
  stage: string;
  value: number;
}

export interface WonLostEntry {
  name: string;
  value: number;
}

export interface ScoreDistributionEntry {
  range: string;
  count: number;
}

export interface RevenueGoalEntry {
  month: string;
  actual: number;
  target: number;
}

interface DateRange {
  from: string;
  to: string;
}

export function useAnalyticsData(dateRange: DateRange) {
  const {
    data: leadStats,
    isLoading: statsLoading,
    isError: statsError,
    refetch,
  } = useLeadStats({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });
  const { data: allDeals, isLoading: dealsLoading } = useDeals();
  const { data: leaderboard, isLoading: leaderLoading } = useSalesLeaderboard();
  const { data: slaReport, isLoading: slaLoading } = useSlaReport();
  const { data: allLeadsResult, isLoading: leadsLoading } = useLeads({
    limit: 100,
  });
  const allLeads = allLeadsResult?.leads;
  const { data: taskAnalytics } = useTaskAnalytics(30);

  const { data: analyticsSummary, isLoading: summaryLoading } =
    useLeadAnalyticsSummary({
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
    });

  const { data: kpis } = useSalesDashboardKPIs({
    from: dateRange.from,
    to: dateRange.to,
  });

  const { data: revenueVsGoal, isLoading: revenueGoalLoading } =
    useRevenueVsGoal(new Date().getFullYear());

  const isLoading =
    statsLoading ||
    dealsLoading ||
    leaderLoading ||
    slaLoading ||
    leadsLoading ||
    summaryLoading;

  const isError = statsError;

  const funnelData = useMemo((): FunnelEntry[] => {
    if (!leadStats) return [];
    return [
      { name: "New", value: leadStats.byStatus.NEW, fill: "#3B82F6" },
      { name: "Contacted", value: leadStats.byStatus.CONTACTED, fill: "#0EA5E9" },
      { name: "Interested", value: leadStats.byStatus.INTERESTED, fill: "#F59E0B" },
      { name: "Qualified", value: leadStats.byStatus.QUALIFIED, fill: "#60a5fa" },
      { name: "Converted", value: leadStats.byStatus.CONVERTED, fill: "#10B981" },
    ].filter((s) => s.value > 0);
  }, [leadStats]);

  const leadVolumeTrend = useMemo((): LeadVolumeEntry[] => {
    if (!allLeads) return [];
    const weeks: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      weeks[`W${12 - i}`] = 0;
    }
    const now = new Date();
    allLeads.forEach((lead) => {
      const createdAt = lead.createdAt;
      if (!createdAt) return;
      const diffDays = Math.floor(
        (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      const weekIndex = Math.floor(diffDays / 7);
      if (weekIndex < 12) {
        const key = `W${12 - weekIndex}`;
        if (weeks[key] !== undefined) weeks[key]++;
      }
    });
    return Object.entries(weeks).map(([week, leads]) => ({ week, leads }));
  }, [allLeads]);

  const sourceBreakdown = useMemo((): SourceEntry[] => {
    if (!allLeads) return [];
    const map: Record<string, number> = {};
    allLeads.forEach((l) => {
      const src = l.source?.replace(/_/g, " ") ?? "unknown";
      map[src] = (map[src] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [allLeads]);

  const dealsByStageValue = useMemo((): DealStageValueEntry[] => {
    if (!allDeals) return [];
    const map: Record<string, number> = {};
    allDeals.forEach((d) => {
      map[d.stage] = (map[d.stage] ?? 0) + Number(d.value ?? 0);
    });
    return Object.entries(map).map(([stage, value]) => ({
      stage,
      value: Math.round(value / 100000),
    }));
  }, [allDeals]);

  const wonLostReasons = useMemo((): WonLostEntry[] => {
    if (!allDeals) return [];
    const won = allDeals.filter((d) => d.stage === "WON").length;
    const lost = allDeals.filter((d) => d.stage === "LOST").length;
    const data: WonLostEntry[] = [];
    if (won > 0) data.push({ name: "Won", value: won });
    if (lost > 0) data.push({ name: "Lost", value: lost });
    return data;
  }, [allDeals]);

  const scoreDistribution = useMemo((): ScoreDistributionEntry[] => {
    if (!allLeads) return [];
    const buckets: Record<string, number> = {
      "0–20": 0,
      "21–40": 0,
      "41–60": 0,
      "61–80": 0,
      "81–100": 0,
    };
    allLeads.forEach((l) => {
      const score = l.score ?? 0;
      if (score <= 20) buckets["0–20"]++;
      else if (score <= 40) buckets["21–40"]++;
      else if (score <= 60) buckets["41–60"]++;
      else if (score <= 80) buckets["61–80"]++;
      else buckets["81–100"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [allLeads]);

  const revenueGoalData = useMemo((): RevenueGoalEntry[] => {
    if (!revenueVsGoal) return [];
    return revenueVsGoal.map((m) => ({
      month: m.month,
      actual: Math.round(m.actual / 100000),
      target: Math.round(m.target / 100000),
    }));
  }, [revenueVsGoal]);

  return {
    isLoading,
    isError,
    refetch,
    slaLoading,
    revenueGoalLoading,
    leaderboard,
    slaReport,
    analyticsSummary,
    kpis,
    taskAnalytics,
    funnelData,
    leadVolumeTrend,
    sourceBreakdown,
    dealsByStageValue,
    wonLostReasons,
    scoreDistribution,
    revenueGoalData,
  };
}
