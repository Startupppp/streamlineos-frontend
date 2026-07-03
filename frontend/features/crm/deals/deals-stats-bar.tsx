"use client";

import { TrendingUp, IndianRupee, Trophy, Target } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { formatINRCompact } from "@/lib/format-utils";

interface DealsStatsBarProps {
  total: number;
  totalValue: number;
  wonValue: number;
  avgProbability: number;
}

export function DealsStatsBar({ total, totalValue, wonValue, avgProbability }: DealsStatsBarProps) {
  return (
    <StatCardGrid cols={4}>
      <StatCard label="Total Deals" value={total} icon={TrendingUp} tone="blue" />
      <StatCard label="Pipeline Value" value={formatINRCompact(totalValue)} icon={IndianRupee} tone="default" />
      <StatCard label="Won Value" value={formatINRCompact(wonValue)} icon={Trophy} tone="emerald" />
      <StatCard label="Avg Probability" value={`${avgProbability}%`} icon={Target} tone="amber" />
    </StatCardGrid>
  );
}
