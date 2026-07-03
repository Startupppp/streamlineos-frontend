"use client";

import { BarChart2, Search, ThumbsUp, FileText, Eye, Lock } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbAnalyticsOverview, useKbNoResults } from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import type { KbNoResultRow } from "@/types/kb";

function NoResultsRow({ row, rank }: { row: KbNoResultRow; rank: number }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors">
      <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums">{rank}</span>
      <span className="flex-1 text-sm truncate">{row.query ?? "(empty)"}</span>
      <span className="text-xs font-medium tabular-nums text-muted-foreground">{row.count}</span>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[56px] rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

export default function KnowledgeAnalyticsPage() {
  const canView = useCan("kb:analytics:view");
  const { data: overview, isLoading: overviewLoading } = useKbAnalyticsOverview();
  const { data: noResults = [], isLoading: noResultsLoading } = useKbNoResults();

  if (!canView) {
    return (
      <PageWrapper title="Analytics">
        <EmptyState
          illustration={<Lock className="h-8 w-8 text-muted-foreground/40" />}
          title="Access restricted"
          description="You don't have permission to view knowledge base analytics."
        />
      </PageWrapper>
    );
  }

  const isLoading = overviewLoading || noResultsLoading;

  if (isLoading) {
    return (
      <PageWrapper title="Analytics">
        <AnalyticsSkeleton />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Analytics">
      {overview && (
        <>
          <StatCardGrid cols={5} className="mb-6">
            <StatCard
              label="Total pages"
              value={overview.totalCount}
              icon={FileText}
              tone="default"
            />
            <StatCard
              label="Total views"
              value={overview.totalViews}
              icon={Eye}
              tone="blue"
            />
            <StatCard
              label="Searches"
              value={overview.searches}
              icon={Search}
              tone="violet"
            />
            <StatCard
              label="Helpful votes"
              value={overview.helpfulUp}
              icon={ThumbsUp}
              tone="emerald"
            />
            <StatCard
              label="Search success"
              value={`${Math.round(overview.searchSuccessRate)}%`}
              icon={BarChart2}
              tone="amber"
            />
          </StatCardGrid>
        </>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">No-result searches</h2>
          {noResults.length > 0 && (
            <span className="text-xs text-muted-foreground">{noResults.length} queries</span>
          )}
        </div>

        {noResults.length === 0 ? (
          <EmptyState
            illustration={<Search className="h-6 w-6 text-muted-foreground/40" />}
            title="No zero-result searches"
            description="All recent searches returned at least one result."
            compact
          />
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
            <div className="flex items-center gap-3 px-3 py-2 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground w-5">#</span>
              <span className="flex-1 text-xs font-medium text-muted-foreground">Query</span>
              <span className="text-xs font-medium text-muted-foreground">Count</span>
            </div>
            {noResults.map((row, i) => (
              <NoResultsRow key={i} row={row} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
