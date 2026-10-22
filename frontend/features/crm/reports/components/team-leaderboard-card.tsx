"use client";

import { useCallback, useMemo } from "react";
import { Trophy } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { RecordList } from "@/components/renderer";
import { useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { TEAM_LEADERBOARD_LAYOUT } from "@/lib/renderer/crm/reports/team-leaderboard-layout";
import { repPerformanceFields } from "@/lib/renderer/crm/reports/rep-performance-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useSalesLeaderboard } from "@/hooks/api/leads";
import type { SalesLeaderboardEntry } from "@/types/leads";

interface TeamLeaderboardCardProps {
  leaderboard: SalesLeaderboardEntry[] | undefined;
  isLoading: boolean;
}

export function TeamLeaderboardCard({
  leaderboard,
  isLoading,
}: TeamLeaderboardCardProps) {
  const layout = useTenantLayout(TEAM_LEADERBOARD_LAYOUT);
  const money = useOrgDisplay();
  const [density] = useDensity();
  const { isError, refetch } = useSalesLeaderboard();

  const rows = useMemo(
    () => (leaderboard ?? []).map((rep, index) => repPerformanceFields(rep, index)),
    [leaderboard],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-status-warning-ink" />
          Team Leaderboard
        </CardTitle>
      </CardHeader>
      {isLoading ? (
        <DataTableSkeleton rows={6} columns={layout.list.columns.length} className="border-0" />
      ) : isError ? (
        <ErrorState
          compact
          title="Couldn't load the leaderboard"
          description="The leaderboard didn't load. Check your connection and try again."
          onRetry={handleRetry}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          title="No rep has worked a lead yet"
          description="Assign a lead to somebody and they take their place here."
        />
      ) : (
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={(row) => String(row.userId)}
          density={density}
          money={money}
          minWidth="720px"
        />
      )}
    </Card>
  );
}
