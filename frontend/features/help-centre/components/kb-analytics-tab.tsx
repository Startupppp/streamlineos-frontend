"use client";

import { useMemo } from "react";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Sparkles, Search, BookOpen, AlertCircle } from "lucide-react";
import { KbContentGaps } from "./kb-content-gaps";
import { useKbAnalyticsOverview } from "@/hooks/api/kb/analytics";

function overviewValue(value: number | null, reason?: string): string | number {
  if (reason === "minimum_cohort") return "Suppressed";
  if (reason === "incomplete_scope") return "Unavailable";
  return value ?? "Unavailable";
}

function overviewHint(reason?: string): string | undefined {
  if (reason === "minimum_cohort") return "Fewer than 3 records in this cohort";
  if (reason === "incomplete_scope") return "Historical space attribution is incomplete";
  return undefined;
}

export function KbAnalyticsTab() {
  const { data, isLoading, isError, error, refetch } = useKbAnalyticsOverview();
  const pageState = usePageState({
    permission: "kb:analytics:view",
    isLoading,
    isError,
    error,
  });

  const stats = useMemo(() => {
    if (!data) return null;
    return {
      total: data.totalCount,
      published: data.publishedCount,
      aiAnswers: data.aiAnswers,
      aiNoContext: data.aiNoContext,
      suppressionReasons: data.suppressionReasons,
    };
  }, [data]);

  function handleRetry() {
    void refetch();
  }

  return (
    <PageState resolution={pageState} loading={<StatCardGridSkeleton count={4} />} onRetry={handleRetry} compact>
      <div className="space-y-4">
        {stats && (
          <StatCardGrid cols={4}>
            <StatCard label="Total articles" value={overviewValue(stats.total, stats.suppressionReasons.totalCount)} hint={overviewHint(stats.suppressionReasons.totalCount)} icon={BookOpen} />
            <StatCard label="Published" value={overviewValue(stats.published, stats.suppressionReasons.publishedCount)} hint={overviewHint(stats.suppressionReasons.publishedCount)} icon={BookOpen} tone="emerald" />
            <StatCard label="Organization AI answers" value={overviewValue(stats.aiAnswers, stats.suppressionReasons.aiAnswers)} hint={overviewHint(stats.suppressionReasons.aiAnswers)} icon={Sparkles} tone="blue" />
            <StatCard label="Organization AI no context" value={overviewValue(stats.aiNoContext, stats.suppressionReasons.aiNoContext)} hint={overviewHint(stats.suppressionReasons.aiNoContext)} icon={AlertCircle} tone="amber" />
          </StatCardGrid>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Content Gaps</h3>
            <span className="text-dense text-muted-foreground">Queries with no useful results</span>
          </div>
          <KbContentGaps />
        </div>
      </div>
    </PageState>
  );
}
