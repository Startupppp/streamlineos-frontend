"use client";

import { useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useCompOffBalance } from "@/hooks/api/hr/overtime";
import { getErrorMessage } from "@/lib/get-error-message";
import { TrendingUp, CheckCircle2, Calendar } from "lucide-react";

export function CompOffPanel() {
  const { data: balances, isLoading, isError, error, refetch } = useCompOffBalance();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return <StatCardGridSkeleton cols={3} count={3} />;
  }

  if (isError) {
    return (
      <ErrorState
        className={CONTENT_FILL_PANEL}
        title="Couldn't load comp-off balance"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
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
    <StatCardGrid cols={3}>
      <StatCard label="Earned Days" value={`${balance.earnedDays} days`} icon={TrendingUp} tone="accent" />
      <StatCard label="Used Days" value={`${balance.usedDays} days`} icon={CheckCircle2} tone="amber" />
      <StatCard label="Remaining" value={`${remaining} days`} icon={Calendar} tone="emerald" />
    </StatCardGrid>
  );
}
