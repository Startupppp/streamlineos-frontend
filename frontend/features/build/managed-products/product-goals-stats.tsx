"use client";

import { AlertTriangle, ClipboardCheck, Target, TrendingUp } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { GoalStats } from "@/hooks/api/goals";

interface ProductGoalsStatsProps {
  stats: GoalStats | undefined;
  isLoading: boolean;
}

export function ProductGoalsStats({ stats, isLoading }: ProductGoalsStatsProps) {
  return (
    <StatCardGrid cols={5}>
      <StatCard
        label="Total Goals"
        value={stats?.total ?? 0}
        icon={Target}
        tone="default"
        isLoading={isLoading}
      />
      <StatCard
        label="On Track"
        value={stats?.byStatus.on_track ?? 0}
        icon={TrendingUp}
        tone="emerald"
        isLoading={isLoading}
      />
      <StatCard
        label="At Risk"
        value={stats?.atRisk ?? 0}
        icon={AlertTriangle}
        tone="amber"
        isLoading={isLoading}
      />
      <StatCard
        label="Avg Progress"
        value={`${stats?.avgProgress ?? 0}%`}
        icon={TrendingUp}
        tone="default"
        isLoading={isLoading}
      />
      <StatCard
        label="Stale Check-ins"
        value={stats?.staleCheckIns ?? 0}
        icon={ClipboardCheck}
        tone={(stats?.staleCheckIns ?? 0) > 0 ? "amber" : "default"}
        isLoading={isLoading}
      />
    </StatCardGrid>
  );
}
