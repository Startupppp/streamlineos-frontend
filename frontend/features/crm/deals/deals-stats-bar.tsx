"use client";

import { memo } from "react";
import { TrendingUp, IndianRupee, Trophy, Target } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { formatMoneyCompact } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";

interface DealsStatsBarProps {
  total: number;
  totalValue: number;
  wonValue: number;
  avgProbability: number;
}

export const DealsStatsBar = memo(function DealsStatsBar({ total, totalValue, wonValue, avgProbability }: DealsStatsBarProps) {
  const money = useOrgDisplay();
  return (
    <StatCardGrid cols={4}>
      <StatCard label="Total Deals" value={total} icon={TrendingUp} tone="blue" />
      <StatCard label="Pipeline Value" value={formatMoneyCompact(totalValue, money)} icon={IndianRupee} tone="default" />
      <StatCard label="Won Value" value={formatMoneyCompact(wonValue, money)} icon={Trophy} tone="emerald" />
      <StatCard label="Avg Probability" value={`${avgProbability}%`} icon={Target} tone="amber" />
    </StatCardGrid>
  );
});
