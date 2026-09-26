"use client";

import { useCallback } from "react";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { Route, ChevronRight, AlertTriangle } from "lucide-react";
import { useCriticalPath } from "@/hooks/api/build/reports";
import { ChartCard, numberFormatter } from "./chart-card";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

export function CriticalPathSection({ projectId }: { projectId: number }) {
  const { data, isLoading, isError, error, refetch } = useCriticalPath(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const chain = data?.criticalPath ?? [];

  const resolution = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: chain.length === 0,
  });

  return (
    <ChartCard title="Critical Path" icon={Route}>
      <PageState
        resolution={resolution}
        loading={<LoadingState variant="cards" rows={2} />}
        empty={
          <EmptyState
            illustration={<EmptySearchIllustration />}
            title="No dependency chain yet"
            description="Add 'blocks' relations between tickets to compute the critical path."
            compact
          />
        }
        onRetry={handleRetry}
        compact
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-foreground">
              Total duration:{" "}
              {numberFormatter.format(data?.totalDuration ?? 0)}
            </span>
            <span className="text-muted-foreground">
              {numberFormatter.format(chain.length)}{" "}
              {chain.length === 1 ? "step" : "steps"}
            </span>
            <span className="text-muted-foreground">
              {numberFormatter.format(data?.edgeCount ?? 0)} dependencies across{" "}
              {numberFormatter.format(data?.nodeCount ?? 0)} tickets
            </span>
          </div>
          {data?.hasCycle ? (
            <div className="flex items-start gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-xs text-status-warning-ink-strong">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                A dependency cycle was detected. Cycle edges were ignored, so
                this path is approximate. Review the &apos;blocks&apos; relations
                to remove the loop.
              </span>
            </div>
          ) : null}
          <ol className="flex flex-wrap items-stretch gap-2">
            {chain.map((node, index) => (
              <li key={node.ticketId} className="flex items-center gap-2">
                <div className="flex min-w-[8rem] flex-col rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <span
                    className="truncate text-xs font-medium text-foreground"
                    title={node.title}
                  >
                    {node.title}
                  </span>
                  <span className="mt-1 text-dense text-muted-foreground">
                    Estimate {numberFormatter.format(node.estimate)} · Finish{" "}
                    {numberFormatter.format(node.earliestFinish)}
                  </span>
                </div>
                {index < chain.length - 1 ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </PageState>
    </ChartCard>
  );
}
