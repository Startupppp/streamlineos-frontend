"use client";

import { useCallback, useMemo } from "react";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { RecordList } from "@/features/renderer";
import { useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  REP_PERFORMANCE_LAYOUT,
  repPerformanceFields,
} from "@/lib/renderer/crm/reports/rep-performance-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useSalesLeaderboard } from "@/hooks/api/leads";
import type { SalesLeaderboardEntry } from "@/types/leads";
import { AnalyticsChartCard } from "./analytics-chart-card";

/**
 * Rep performance.
 *
 * No table is written here. The columns, the right-aligned tabular figures, the
 * conversion rate's tone and the mobile card all come from
 * `REP_PERFORMANCE_LAYOUT`; what is left is the card it sits in and which of the
 * four states the reader is actually in.
 *
 * It was in none of them before. The card had no loading branch at all, so a
 * query still in flight rendered "No rep activity in this period" — a product
 * telling somebody their team did nothing, at the moment it did not yet know.
 * The status comes from the same leaderboard query the analytics page already
 * reads: identical key, so Query serves it from cache and no second request is
 * made. Rows still arrive as a prop, because the page holds them.
 */

interface RepPerformanceTableProps {
  leaderboard: SalesLeaderboardEntry[] | undefined;
}

export function RepPerformanceTable({ leaderboard }: RepPerformanceTableProps) {
  const layout = useTenantLayout(REP_PERFORMANCE_LAYOUT);
  const money = useOrgDisplay();
  const [density] = useDensity();
  const { isPending, isError, refetch } = useSalesLeaderboard();

  const rows = useMemo(
    () => (leaderboard ?? []).map((rep, index) => repPerformanceFields(rep, index)),
    [leaderboard],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <AnalyticsChartCard title="Rep Performance" data={rows} filename="rep-performance">
      {isPending ? (
        <DataTableSkeleton rows={6} columns={layout.list.columns.length} className="border-0" />
      ) : isError ? (
        <ErrorState
          compact
          title="Couldn't load rep performance"
          description="The leaderboard didn't load. Check your connection and try again."
          onRetry={handleRetry}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          title="No rep activity yet"
          description="Assign a lead or log a call and whoever worked it appears here."
        />
      ) : (
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={(row) => String(row.userId)}
          density={density}
          money={money}
          minWidth="640px"
        />
      )}
    </AnalyticsChartCard>
  );
}
