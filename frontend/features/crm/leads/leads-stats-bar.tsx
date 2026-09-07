"use client";

import { memo } from "react";
import { Users, TrendingUp, BarChart2, IndianRupee, UserX } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { formatINRCompact } from "@/lib/format-utils";

interface LeadsStatsBarProps {
  stats: {
    total: number;
    thisMonth: number;
    byStatus: Record<string, number>;
    conversionRate: number;
    unassigned: number;
    totalPotentialValue: number;
  };
}

export const LeadsStatsBar = memo(function LeadsStatsBar({ stats }: LeadsStatsBarProps) {
  return (
    <StatCardGrid cols={5}>
      <StatCard
        label="Total Leads"
        value={stats.total}
        icon={Users}
        tone="default"
      />
      <StatCard
        label="New This Month"
        value={stats.thisMonth}
        icon={TrendingUp}
        tone="emerald"
      />
      <StatCard
        label="Conversion Rate"
        value={`${stats.conversionRate}%`}
        icon={BarChart2}
        tone="amber"
      />
      <StatCard
        label="Pipeline Value"
        value={formatINRCompact(stats.totalPotentialValue)}
        icon={IndianRupee}
        tone="blue"
      />
      <StatCard
        label="Unassigned"
        value={stats.unassigned}
        icon={UserX}
        tone={stats.unassigned > 0 ? "red" : "default"}
      />
    </StatCardGrid>
  );
});
