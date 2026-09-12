"use client";

import { useCallback, useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";

import { EmptyState } from "@/components/ui/empty-state";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCan } from "@/hooks/api/access";
import { useWorkerEngagements } from "@/hooks/api/directory/workers";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import type { Worker, WorkerEngagement } from "@/types/directory/workers";
import { WorkerEngagementRowActions } from "./worker-engagement-actions";
import { WorkerEngagementForm } from "./worker-engagement-form";
import {
  ENGAGEMENT_STATUS_TONE,
  getEngagementStatusLabel,
  getWorkerEngagementPeriodLabel,
  getWorkerTypeLabel,
} from "./worker-engagement-presentation";

interface WorkerEngagementsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: Worker;
}

export function WorkerEngagementsSheet({
  open,
  onOpenChange,
  worker,
}: WorkerEngagementsSheetProps) {
  const canManage = useCan("directory:workers:manage");
  const canTerminate = useCan("directory:workers:terminate");
  const [editingEngagement, setEditingEngagement] =
    useState<WorkerEngagement | null>(null);

  const {
    data: engagements,
    isLoading,
    isError,
    refetch,
  } = useWorkerEngagements(worker.workerId);

  function handleRetry() {
    void refetch();
  }

  const handleEngagementSaved = useCallback(() => {
    setEditingEngagement(null);
    void refetch();
  }, [refetch]);

  const handleEdit = useCallback((engagement: WorkerEngagement) => {
    setEditingEngagement(engagement);
  }, []);

  const handleEditCancelled = useCallback(() => {
    setEditingEngagement(null);
  }, []);

  const handleEngagementChanged = useCallback(
    (workerEngagementId: string) => {
      setEditingEngagement((currentEngagement) =>
        currentEngagement?.workerEngagementId === workerEngagementId
          ? null
          : currentEngagement,
      );
      void refetch();
    },
    [refetch],
  );

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) setEditingEngagement(null);
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const workerLabel = worker.displayName
    ? worker.displayName
    : ((`${worker.firstName} ${worker.lastName}`.trim() ||
        worker.workerNumber) ??
      "Worker");

  const columns: DataTableColumn<WorkerEngagement>[] = [
    {
      key: "period",
      header: "Period",
      className: "min-w-[180px]",
      cell: (engagement) => (
        <span
          className={cn("text-sm text-foreground tabular-nums", TEXT_ONE_LINE)}
        >
          {getWorkerEngagementPeriodLabel(engagement)}
        </span>
      ),
    },
    {
      key: "workerType",
      header: "Type",
      className: "min-w-[100px]",
      cell: (engagement) => (
        <span className="text-sm text-muted-foreground">
          {getWorkerTypeLabel(engagement.workerType)}
        </span>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      className: "min-w-[120px]",
      cell: (engagement) => (
        <span className={cn("text-sm text-muted-foreground", TEXT_ONE_LINE)}>
          {engagement.designation ?? "—"}
        </span>
      ),
    },
    {
      key: "isPrimary",
      header: "Primary",
      className: "min-w-[70px]",
      cell: (engagement) =>
        engagement.isPrimary ? (
          <SemanticBadge tone="accent" label="Primary" size="xs" />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      className: "min-w-[90px]",
      cell: (engagement) => (
        <SemanticBadge
          tone={ENGAGEMENT_STATUS_TONE[engagement.status]}
          label={getEngagementStatusLabel(engagement.status)}
          size="xs"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "min-w-[160px]",
      cell: (engagement) => (
        <WorkerEngagementRowActions
          engagement={engagement}
          workerId={worker.workerId}
          canManage={canManage}
          canTerminate={canTerminate}
          onEdit={handleEdit}
          onChanged={handleEngagementChanged}
        />
      ),
    },
  ];

  const engagementRows = engagements ?? [];

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <SheetTitle className="text-base font-semibold">
            Engagements — {workerLabel}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {worker.workerNumber ? `#${worker.workerNumber} Â· ` : ""}
            Manage engagements for this worker.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-4 px-6 py-4">
          {isLoading ? (
            <DataTableSkeleton rows={5} columns={6} />
          ) : isError ? (
            <ErrorState compact onRetry={handleRetry} />
          ) : engagementRows.length === 0 ? (
            <EmptyState
              compact
              illustrationPreset="default"
              title="No engagements yet"
              description="Add the first engagement for this worker."
            />
          ) : (
            <DataTable
              data={engagementRows}
              columns={columns}
              getRowKey={(engagement) => engagement.workerEngagementId}
              minWidth="520px"
            />
          )}

          {canManage ? (
            <WorkerEngagementForm
              key={editingEngagement?.workerEngagementId ?? "new-engagement"}
              workerId={worker.workerId}
              engagements={engagementRows}
              editingEngagement={editingEngagement}
              onSuccess={handleEngagementSaved}
              onEditCancelled={handleEditCancelled}
            />
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
