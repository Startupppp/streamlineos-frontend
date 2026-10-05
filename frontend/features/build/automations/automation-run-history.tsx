"use client";

import { useCallback, useMemo } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import {
  useAutomationRuns,
  useReplayAutomationRun,
} from "@/hooks/api/build/automations";
import type { AutomationRunRow } from "@/hooks/api/build/automation-analysis-schema";
import { useCan } from "@/hooks/api/access";

type RunOutcome = AutomationRunRow["outcome"];

const OUTCOME_TONE: Record<RunOutcome, string> = {
  matched_success: "text-status-success-ink bg-status-success-fill/10 border-status-success-fill/30",
  matched_partial_failure: "text-status-warning-ink bg-status-warning-fill/10 border-status-warning-fill/30",
  matched_failed: "text-status-danger-ink-strong bg-status-danger-fill/10 border-status-danger-fill/30",
  not_matched: "text-muted-foreground bg-muted/40 border-border",
  blocked_loop_guard: "text-muted-foreground bg-muted/40 border-border",
  blocked_rate_limit: "text-status-warning-ink bg-status-warning-fill/10 border-status-warning-fill/30",
  error: "text-status-danger-ink-strong bg-status-danger-fill/10 border-status-danger-fill/30",
};

const OUTCOME_LABEL: Record<RunOutcome, string> = {
  matched_success: "Success",
  matched_partial_failure: "Partial failure",
  matched_failed: "Failed",
  not_matched: "No match",
  blocked_loop_guard: "Loop guard",
  blocked_rate_limit: "Rate limit",
  error: "Error",
};

const FAILED_OUTCOMES: ReadonlySet<RunOutcome> = new Set([
  "matched_failed",
  "matched_partial_failure",
  "error",
]);

interface RunRowProps {
  run: AutomationRunRow;
  canManage: boolean;
  onReplay: (runId: number) => void;
  isReplaying: boolean;
}

function RunRow({ run, canManage, onReplay, isReplaying }: RunRowProps) {
  const handleReplay = useCallback(() => onReplay(run.id), [run.id, onReplay]);
  const isFailed = FAILED_OUTCOMES.has(run.outcome);

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn("text-micro px-1.5 py-0 border", OUTCOME_TONE[run.outcome])}
          >
            {OUTCOME_LABEL[run.outcome]}
          </Badge>
          <span className="text-xs text-muted-foreground">{run.triggerEvent}</span>
          {run.ticketId !== null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              ticket #{run.ticketId}
            </span>
          )}
        </div>
        <span className="text-micro text-muted-foreground tabular-nums">
          {new Date(run.createdAt).toLocaleString()}
        </span>
        {run.errorMessage !== null && (
          <p className="mt-0.5 text-micro text-status-danger-ink-strong truncate">{run.errorMessage}</p>
        )}
      </div>
      {canManage && isFailed && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs shrink-0"
          onClick={handleReplay}
          disabled={isReplaying}
          aria-label="Replay this run"
        >
          {isReplaying ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Replay
        </Button>
      )}
    </div>
  );
}

interface AutomationRunHistoryProps {
  projectId: number;
  automationId: number;
}

export function AutomationRunHistory({ projectId, automationId }: AutomationRunHistoryProps) {
  const canManage = useCan("build:manage");

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAutomationRuns(projectId, automationId);

  const replay = useReplayAutomationRun(projectId);

  const allRuns = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const handleReplay = useCallback(
    (runId: number) => {
      replay.mutate(runId, {
        onSuccess: () => toast.success("Run replayed"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [replay],
  );

  const handleLoadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (allRuns.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No runs recorded yet.</p>
    );
  }

  return (
    <div className="space-y-1.5">
      {allRuns.map((run) => (
        <RunRow
          key={run.id}
          run={run}
          canManage={canManage}
          onReplay={handleReplay}
          isReplaying={replay.isPending && replay.variables === run.id}
        />
      ))}
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={handleLoadMore}
        label="Load more runs"
      />
    </div>
  );
}
