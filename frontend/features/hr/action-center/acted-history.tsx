"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import {
  CONTENT_FILL_PANEL,
  ContentFillPanel,
} from "@/components/ui/content-fill-panel";
import { formatRelativeTime } from "@/lib/date-utils";
import { getUserDisplayName } from "@/lib/person-display";
import { activationProps } from "@/lib/keyboard-activation";
import { useWorkflowActed } from "@/hooks/api/hr/hr-workflows";
import {
  HR_WORKFLOW_OBJECT_TYPE_LABELS,
  type HrWorkflowInstance,
} from "@/types/hr/workflows";

interface ActedHistoryProps {
  enabled: boolean;
  onOpenInstance: (instanceId: number) => void;
}

export function ActedHistory({ enabled, onOpenInstance }: ActedHistoryProps) {
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);

  const { data, isLoading, isFetching, isError, refetch, access } =
    useWorkflowActed({ cursor, limit: 50 }, { enabled });

  function handleRetry(): void {
    void refetch();
  }

  function handlePrevious(): void {
    setCursorHistory((history) =>
      history.length > 1 ? history.slice(0, -1) : history,
    );
  }

  function handleNext(): void {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }

  if (access.denied)
    return <NoPermissionState permission="hr:workflows:approve" />;

  if (isError)
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load history"
        description="Failed to load acted approvals. Please try again."
        onRetry={handleRetry}
      />
    );

  if (isLoading)
    return (
      <ContentFillPanel className="gap-2 p-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-lg" />
        ))}
      </ContentFillPanel>
    );

  const acted = data?.data ?? [];

  if (acted.length === 0)
    return (
      <EmptyState
        illustrationPreset="approval"
        title="No actions yet"
        description="Requests you have approved or rejected will appear here."
        className={CONTENT_FILL_PANEL}
      />
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ContentFillPanel className="p-0">
        <ul>
          {acted.map((instance) => (
            <ActedRow
              key={instance.id}
              instance={instance}
              onOpen={onOpenInstance}
            />
          ))}
        </ul>
      </ContentFillPanel>
      {data && (page > 1 || data.pagination.hasMore) ? (
        <CursorPageControls
          page={page}
          hasNext={data.pagination.hasMore}
          disabled={isFetching}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      ) : null}
    </div>
  );
}

function ActedRow({
  instance,
  onOpen,
}: {
  instance: HrWorkflowInstance;
  onOpen: (instanceId: number) => void;
}) {
  function handleOpen(): void {
    onOpen(instance.id);
  }

  return (
    <li
      className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 outline-none transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      {...activationProps(handleOpen)}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium">
          {HR_WORKFLOW_OBJECT_TYPE_LABELS[instance.objectType]}
        </p>
        <p className="truncate text-dense text-muted-foreground">
          {instance.requester
            ? getUserDisplayName(instance.requester)
            : (instance.requesterName ?? instance.requestedBy)}
          {" · "}
          <span className="tabular-nums">
            {formatRelativeTime(instance.updatedAt)}
          </span>
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </li>
  );
}
