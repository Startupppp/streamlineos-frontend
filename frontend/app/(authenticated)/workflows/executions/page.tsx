"use client";

import { useState } from "react";
import { format } from "date-fns";
import { XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import {
  useAllExecutions,
  useCancelExecution,
  type WorkflowExecution,
  type ExecutionStatus,
} from "@/hooks/api/workflows";

const PAGE_SIZE = 20;

const STATUS_BADGE_CLASS: Record<ExecutionStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-status-info-surface text-status-info-ink animate-pulse",
  waiting: "bg-status-warning-surface text-status-warning-ink",
  completed: "bg-status-success-surface text-status-success-ink",
  failed: "bg-status-danger-surface text-status-danger-ink",
  cancelled: "bg-muted text-muted-foreground",
  timed_out: "bg-status-warning-surface text-status-warning-ink",
};

const STATUS_TABS: Array<{ label: string; value: ExecutionStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
  { label: "Pending", value: "pending" },
  { label: "Cancelled", value: "cancelled" },
];

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function ExecutionRow({
  execution,
  onCancel,
  isCancelling,
}: {
  execution: WorkflowExecution;
  onCancel: (e: WorkflowExecution) => void;
  isCancelling: boolean;
}) {
  function handleCancel() {
    onCancel(execution);
  }

  const canCancel = execution.status === "running" || execution.status === "waiting";

  return (
    <div className="grid grid-cols-[2fr,1fr,1fr,1.5fr,1fr,auto] gap-3 items-center px-4 py-3 rounded-lg hover:bg-muted transition-colors">
      <span className="text-sm font-mono text-foreground truncate">
        {execution.workflowId.slice(0, 8)}...
      </span>
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit",
          STATUS_BADGE_CLASS[execution.status],
        )}
      >
        {execution.status.replace("_", " ")}
      </span>
      <span className="text-sm text-muted-foreground">{execution.triggerType ?? "—"}</span>
      <span className="text-sm text-muted-foreground">
        {execution.startedAt ? format(new Date(execution.startedAt), "MMM d, HH:mm") : "—"}
      </span>
      <span className="text-sm text-muted-foreground">{formatDuration(execution.durationMs)}</span>
      <div className="flex items-center justify-end">
        {canCancel && (
          <Button
            size="icon"
            variant="ghost"
            className="w-7 text-destructive hover:text-destructive"
            onClick={handleCancel}
            disabled={isCancelling}
            aria-label="Cancel execution"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ExecutionsPage() {
  const [activeStatus, setActiveStatus] = useState<ExecutionStatus | "all">("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>([]);

  const { data, isLoading, isError, refetch } = useAllExecutions({
    ...(cursor !== null ? { cursor } : {}),
    limit: PAGE_SIZE,
    ...(activeStatus !== "all" ? { status: activeStatus } : {}),
  });

  const cancelExecution = useCancelExecution();
  const pageNumber = previousCursors.length + 1;

  function handleStatusChange(status: ExecutionStatus | "all") {
    setActiveStatus(status);
    setCursor(null);
    setPreviousCursors([]);
  }

  function handlePrevPage() {
    setPreviousCursors((stack) => {
      if (stack.length === 0) return stack;
      setCursor(stack[stack.length - 1] ?? null);
      return stack.slice(0, -1);
    });
  }

  function handleNextPage() {
    const next = data?.pagination.nextCursor ?? null;
    if (next === null) return;
    setPreviousCursors((stack) => [...stack, cursor]);
    setCursor(next);
  }

  function handleCancel(execution: WorkflowExecution) {
    cancelExecution.mutate(
      { workflowId: execution.workflowId, executionId: execution.id },
      {
        onSuccess: () => toast.success("Execution cancelled"),
        onError: () => toast.error("Failed to cancel execution"),
      },
    );
  }

  function handleRetry() {
    void refetch();
  }

  const statusFilters = (
    <div className={FILTER_TOOLBAR_ROW}>
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleStatusChange(tab.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
            activeStatus === tab.value
              ? "bg-primary/10 text-foreground border border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <PageWrapper
      title="Execution Monitor"
      subtitle="Track real-time and historical workflow execution status"
      filters={statusFilters}
    >
      {isLoading ? (
        <LoadingState variant="list" rows={12} />
      ) : isError ? (
        <ErrorState title="Failed to load executions" onRetry={handleRetry} className={CONTENT_FILL_PANEL} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          illustration={<EmptyActivityIllustration />}
          title="No executions found"
          description="Workflow executions will appear here once workflows are triggered."
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-1">
          <div className="grid grid-cols-[2fr,1fr,1fr,1.5fr,1fr,auto] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/60 shrink-0">
            <span>Workflow</span>
            <span>Status</span>
            <span>Trigger</span>
            <span>Started</span>
            <span>Duration</span>
            <span>Actions</span>
          </div>
          {data.data.map((execution) => (
            <ExecutionRow
              key={execution.id}
              execution={execution}
              onCancel={handleCancel}
              isCancelling={
                cancelExecution.isPending &&
                cancelExecution.variables?.executionId === execution.id
              }
            />
          ))}
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <p className="text-sm text-muted-foreground">
              Page {pageNumber}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={previousCursors.length === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={data.pagination.hasMore !== true}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
