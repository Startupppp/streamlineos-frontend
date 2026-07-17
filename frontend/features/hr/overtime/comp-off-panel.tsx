"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useCompOffBalance } from "@/hooks/api/hr/overtime";
import { TrendingUp, CheckCircle2, Calendar } from "lucide-react";

export function CompOffPanel() {
  const { data: balances, isLoading } = useCompOffBalance();

  if (isLoading) {
    return <StatCardGridSkeleton cols={3} count={3} />;
  }

  if (!balances?.length) {
    return (
      <EmptyState
        illustrationPreset="calendar"
        title="No comp-off balance"
        description="Earn comp-off days by converting approved overtime"
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  const balance = balances[0];
  const remaining = (parseFloat(balance.earnedDays) - parseFloat(balance.usedDays)).toFixed(2);

  return (
    <StatCardGrid cols={3}>
      <StatCard label="Earned Days" value={`${balance.earnedDays} days`} icon={TrendingUp} tone="accent" />
      <StatCard label="Used Days" value={`${balance.usedDays} days`} icon={CheckCircle2} tone="amber" />
      <StatCard label="Remaining" value={`${remaining} days`} icon={Calendar} tone="emerald" />
    </StatCardGrid>
  );
}
