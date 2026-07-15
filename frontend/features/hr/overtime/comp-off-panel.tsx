"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useCompOffBalance } from "@/hooks/api/hr/overtime";

export function CompOffPanel() {
  const { data: balances, isLoading } = useCompOffBalance();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { label: "Earned Days", value: balance.earnedDays, color: "text-blue-600" },
        { label: "Used Days", value: balance.usedDays, color: "text-amber-600" },
        { label: "Remaining", value: remaining, color: "text-emerald-600" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-1"
        >
          <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-muted-foreground">days</p>
        </div>
      ))}
    </div>
  );
}
