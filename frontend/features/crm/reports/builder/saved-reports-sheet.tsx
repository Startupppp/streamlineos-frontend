"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { AppSheet } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { useCan } from "@/hooks/api/access";
import { useDeleteReportDefinition, useReportDefinitions } from "@/hooks/api/crm/reporting";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatRelativeTime } from "@/lib/date-utils";
import { toast } from "sonner";
import type { ReportDefinitionSummary } from "@/types/crm/reporting";

const PAGE_SIZE = 20;

interface SavedReportsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenReport: (reportDefinitionId: string) => void;
  /** The report currently loaded into the builder, so the list can say so. */
  currentReportDefinitionId: string | null;
}

/**
 * The saved reports, and the way back into one.
 *
 * Read behind `crm:reporting:view` and deleted behind `crm:reporting:manage`,
 * which is the controller's split: seeing which questions the organisation asks
 * is a different authority from changing them.
 */
export function SavedReportsSheet({
  open,
  onOpenChange,
  onOpenReport,
  currentReportDefinitionId,
}: SavedReportsSheetProps) {
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<ReportDefinitionSummary | null>(null);

  const canManage = useCan("crm:reporting:manage");
  const definitions = useReportDefinitions({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const remove = useDeleteReportDefinition();

  const items = definitions.data ?? [];

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    remove.mutate(
      { reportDefinitionId: pendingDelete.reportDefinitionId },
      {
        onSuccess: () => {
          toast.success(`Deleted "${pendingDelete.name}"`);
          setPendingDelete(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleRetry() {
    void definitions.refetch();
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Saved reports"
      description="Open one to load its question into the builder."
      className="sm:max-w-lg"
    >
      {definitions.access.denied ? (
        <NoPermissionState permission="crm:reporting:view" className="flex-1" />
      ) : definitions.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load the saved reports"
          description={getErrorMessage(definitions.error)}
          onRetry={handleRetry}
        />
      ) : definitions.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          className="flex-1 min-h-[40vh]"
          illustrationPreset="report"
          title="No saved reports yet"
          description="Build a report and save it, and it will be here for everyone who can read reports."
        />
      ) : (
        <div className="flex min-h-0 flex-col gap-2">
          {items.map((definition) => (
            <SavedReportRow
              key={definition.reportDefinitionId}
              definition={definition}
              isCurrent={definition.reportDefinitionId === currentReportDefinitionId}
              canManage={canManage}
              onOpen={onOpenReport}
              onRequestDelete={setPendingDelete}
            />
          ))}

          {/*
            The list endpoint returns a page, not a total, so paging is offered
            by whether this page came back full rather than by a count nobody
            sent. Claiming a total here would mean inventing one.
          */}
          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={
              items.length < PAGE_SIZE
                ? (page - 1) * PAGE_SIZE + items.length
                : page * PAGE_SIZE + 1
            }
            onPageChange={setPage}
          />
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title={`Delete "${pendingDelete?.name ?? ""}"?`}
        description="Anyone who has this report open keeps their results on screen; nobody will be able to run it again. The record of past runs is not affected."
        confirmLabel="Delete report"
        destructive
        isPending={remove.isPending}
        onConfirm={handleConfirmDelete}
      />
    </AppSheet>
  );
}

function SavedReportRow({
  definition,
  isCurrent,
  canManage,
  onOpen,
  onRequestDelete,
}: {
  definition: ReportDefinitionSummary;
  isCurrent: boolean;
  canManage: boolean;
  onOpen: (reportDefinitionId: string) => void;
  onRequestDelete: (definition: ReportDefinitionSummary) => void;
}) {
  function handleOpen() {
    onOpen(definition.reportDefinitionId);
  }

  function handleDelete() {
    onRequestDelete(definition);
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{definition.name}</p>
        {definition.description ? (
          <p className="line-clamp-2 text-label text-muted-foreground">{definition.description}</p>
        ) : null}
        <p className="text-micro text-muted-foreground" title={definition.updatedAt}>
          {definition.sourceKey} · changed {formatRelativeTime(definition.updatedAt)}
          {definition.createdByName ? ` · by ${definition.createdByName}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-gap-inline">
        <Button
          variant={isCurrent ? "secondary" : "outline"}
          size="sm"
          disabled={isCurrent}
          onClick={handleOpen}
        >
          {isCurrent ? "Loaded" : "Open"}
        </Button>
        {canManage ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Delete ${definition.name}`}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
