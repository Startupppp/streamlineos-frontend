"use client";

import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { executiveKpiStats } from "@/features/dashboard/use-dashboard-stat-cards";
import { useExecutiveDashboard } from "@/hooks/api/dashboard";
import { getErrorMessage } from "@/lib/get-error-message";
import { RefreshCw } from "lucide-react";

export function ExecutiveKpiWidget() {
  const { data, isLoading, error, refetch } = useExecutiveDashboard();

  const handleRetry = () => void refetch();

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
        <p role="alert" className="flex-1 text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
        <Button variant="ghost" size="sm" onClick={handleRetry} className="shrink-0">
          <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return <StatCardGridSkeleton cols={4} count={2} />;
  }

  const cards = executiveKpiStats({
    included: true,
    headcount: data.headcount,
    openRoles: data.openRoles,
  });

  return (
    <StatCardGrid cols={4}>
      {cards.map((stat) => (
        <StatCard
          key={stat.id}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
        />
      ))}
    </StatCardGrid>
  );
}
