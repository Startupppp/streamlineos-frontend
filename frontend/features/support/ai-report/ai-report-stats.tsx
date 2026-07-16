"use client";

import { TrendingUp, CheckCircle2, AlertTriangle, BarChart3, Globe, Star } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { SupportAiReportResult } from "@/hooks/api/support/ai";

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function csatLabel(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toFixed(2);
}

interface AiReportStatsProps {
  data: SupportAiReportResult;
}

export function AiReportStats({ data }: AiReportStatsProps) {
  return (
    <StatCardGrid cols={4}>
      <StatCard
        label="Acceptance rate"
        value={pct(data.acceptanceRate)}
        icon={CheckCircle2}
        tone={data.acceptanceRate >= 0.6 ? "emerald" : "amber"}
        hint="AI replies accepted by agents"
      />
      <StatCard
        label="Resolution rate"
        value={pct(data.resolutionRate)}
        icon={TrendingUp}
        tone={data.resolutionRate >= 0.5 ? "emerald" : "default"}
        hint="AI-touched tickets that closed"
      />
      <StatCard
        label="Reopen rate"
        value={pct(data.reopenRate)}
        icon={BarChart3}
        tone={data.reopenRate <= 0.1 ? "emerald" : data.reopenRate >= 0.25 ? "red" : "amber"}
        hint="Tickets reopened after AI reply"
      />
      <StatCard
        label="Escalation rate"
        value={pct(data.escalationRate)}
        icon={AlertTriangle}
        tone={data.escalationRate >= 0.3 ? "amber" : "default"}
        hint="Suggestions below confidence threshold"
      />
      <StatCard
        label="Source coverage"
        value={pct(data.sourceCoverage)}
        icon={Globe}
        tone="default"
        hint="Replies grounded with KB citations"
      />
      <StatCard
        label="Low-confidence rate"
        value={pct(data.unsupportedRate)}
        icon={AlertTriangle}
        tone={data.unsupportedRate >= 0.3 ? "red" : "default"}
        hint="Suggestions flagged as low-confidence"
      />
      {data.csatImpact && (
        <>
          <StatCard
            label="CSAT — AI resolved"
            value={csatLabel(data.csatImpact.aiResolved)}
            icon={Star}
            tone="emerald"
            hint="Avg CSAT on AI-accepted replies"
          />
          <StatCard
            label="CSAT — non-AI resolved"
            value={csatLabel(data.csatImpact.nonAiResolved)}
            icon={Star}
            tone="default"
            hint="Avg CSAT on non-AI tickets"
          />
        </>
      )}
    </StatCardGrid>
  );
}
