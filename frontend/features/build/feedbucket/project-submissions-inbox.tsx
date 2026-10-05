"use client";

import { useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { type DataTableColumn } from "@/components/ui/data-table";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { EmptyInboxIllustration } from "@/components/illustrations";
import {
  type SubmissionRow,
  SubmissionMobileCard,
  DeleteSubmissionButton,
} from "./submission-inbox-columns";
import {
  SubmissionInboxFilters,
} from "./submission-inbox-filters";
import { SubmissionBulkToolbar } from "@/components/shared/submission-bulk-toolbar";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useProjectSubmissionsInbox, PAGE_SIZE } from "./use-project-submissions-inbox";

interface ProjectSubmissionsInboxProps {
  widgetId: number;
  projectId: number;
}

export function ProjectSubmissionsInbox({
  widgetId,
  projectId,
}: ProjectSubmissionsInboxProps) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    filterValues,
    hasActiveFilters,
    serverFilters,
    data,
    isLoading,
    isError,
    error,
    rows,
    baseColumns,
    selected,
    setSelected,
    selectedIds,
    selectionEnabled,
    pendingDeleteId,
    deleteSubmission,
    walk,
    canDelete,
    handleFilterChange,
    handleClearFilters,
    handleRequestDelete,
    handleDeleteDialogChange,
    handleConfirmDelete,
    handleNextPage,
    handlePreviousPage,
    handleRetry,
  } = useProjectSubmissionsInbox({ widgetId, projectId });

  function handleRowClick(row: SubmissionRow) {
    requestLeave(() => router.push(`/build/${projectId}/feedbucket/${row.id}`));
  }

  const handleClearSelection = useCallback(() => {
    setSelected(new Set());
  }, [setSelected]);

  const handleOpenFocusedSubmission = useCallback(
    (index: number) => {
      requestLeave(() => {
        const row = rows[index];
        if (row) router.push(`/build/${projectId}/feedbucket/${row.id}`);
      });
    },
    [rows, projectId, router, requestLeave],
  );

  useBuildListKeyboard({
    itemCount: rows.length,
    onOpen: handleOpenFocusedSubmission,
    onClearSelection: handleClearSelection,
    searchInputRef,
    enabled: pendingDeleteId === null,
  });

  const columns = useMemo<DataTableColumn<SubmissionRow>[]>(() => {
    if (!canDelete) return baseColumns;
    function renderDelete(row: SubmissionRow) {
      return (
        <DeleteSubmissionButton
          submissionId={row.id}
          onRequestDelete={handleRequestDelete}
        />
      );
    }
    return [
      ...baseColumns,
      { key: "actions", header: "", cell: renderDelete, className: "w-8" },
    ];
  }, [canDelete, handleRequestDelete, baseColumns]);

  const renderMobileCard = useCallback(
    (row: SubmissionRow) => (
      <SubmissionMobileCard
        row={row}
        actions={
          canDelete ? (
            <DeleteSubmissionButton
              submissionId={row.id}
              onRequestDelete={handleRequestDelete}
            />
          ) : undefined
        }
      />
    ),
    [canDelete, handleRequestDelete],
  );

  const filteredEmptyState = (
    <EmptyState
      illustration={<EmptyInboxIllustration className="h-24 w-24" />}
      title="No matching submissions"
      description="No submissions match your current filters."
      action={{ label: "Clear filters", onClick: handleClearFilters }}
      className="flex flex-1 min-h-0 h-full flex-col"
    />
  );

  const firstRunEmptyState = (
    <EmptyState
      illustration={<EmptyInboxIllustration className="h-24 w-24" />}
      title="No submissions yet"
      description="Submissions from this widget will appear here once users submit feedback."
      className="flex flex-1 min-h-0 h-full flex-col"
    />
  );

  return (
    <>
      <SubmissionInboxFilters
        values={filterValues}
        onChange={handleFilterChange}
        onClearAll={handleClearFilters}
        searchInputRef={searchInputRef}
      />

      {selectedIds.length > 0 ? (
        <SubmissionBulkToolbar
          selectedIds={selectedIds}
          filters={serverFilters}
          onClearSelection={handleClearSelection}
        />
      ) : null}

      <BuildListSurface<SubmissionRow>
        permission="feedbucket:submissions:view"
        rows={rows}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        error={error}
        isFiltered={hasActiveFilters}
        getRowKey={getSubmissionRowKey}
        onRowClick={handleRowClick}
        mobileCard={renderMobileCard}
        selection={
          selectionEnabled
            ? {
                selected,
                onChange: setSelected,
                getRowLabel: getSubmissionRowLabel,
              }
            : undefined
        }
        pagination={{
          mode: "cursor",
          pageSize: PAGE_SIZE,
          pageNumber: walk.pageNumber,
          hasMore: data?.pagination.hasMore ?? false,
          hasPrevious: walk.hasPrevious,
          onNext: handleNextPage,
          onPrevious: handlePreviousPage,
        }}
        rowClassName={submissionRowClassName}
        onRetry={handleRetry}
        empty={firstRunEmptyState}
        filteredEmpty={filteredEmptyState}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        destructive
        title="Delete this submission?"
        description="This submission is removed from the inbox and can no longer be opened. You cannot undo this from here."
        confirmLabel="Delete submission"
        isPending={deleteSubmission.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

function getSubmissionRowKey(row: SubmissionRow): number {
  return row.id;
}

function getSubmissionRowLabel(row: SubmissionRow): string {
  return row.message.slice(0, 80);
}

function submissionRowClassName(): string {
  return "cursor-pointer";
}
