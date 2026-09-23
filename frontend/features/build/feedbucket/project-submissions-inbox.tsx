"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { useCan } from "@/hooks/api/access";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import {
  useDeleteFeedbucketSubmission,
  useFeedbucketSubmissions,
} from "@/hooks/api/feedbucket";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  FeedbucketSubmissionFilters,
  FeedbucketSubmissionType,
  FeedbucketSubmissionStatus,
} from "@/types/feedbucket";
import {
  DeleteSubmissionButton,
  SUBMISSION_COLUMNS,
  type SubmissionRow,
} from "./submission-inbox-columns";
import {
  SubmissionInboxFilters,
  type SubmissionInboxFilterValues,
} from "./submission-inbox-filters";
import { SubmissionBulkToolbar } from "./submission-bulk-toolbar";

const PAGE_SIZE = 25;

const FILTER_PARAMS = ["status", "type", "linked", "assigneeId", "search", "from", "to"] as const;

interface ProjectSubmissionsInboxProps {
  widgetId: number;
  projectId: number;
}

export function ProjectSubmissionsInbox({
  widgetId,
  projectId,
}: ProjectSubmissionsInboxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const canDelete = useCan("feedbucket:submissions:delete");
  const canUpdate = useCan("feedbucket:submissions:update");
  const deleteSubmission = useDeleteFeedbucketSubmission();
  const walk = useCursorPagination();
  const { reset: resetWalk } = walk;

  const filterValues = useMemo<SubmissionInboxFilterValues>(
    () => ({
      status: searchParams.get("status") as FeedbucketSubmissionStatus | null,
      type: searchParams.get("type") as FeedbucketSubmissionType | null,
      linked: searchParams.get("linked") as "linked" | "unlinked" | null,
      assigneeId: searchParams.get("assigneeId"),
      search: searchParams.get("search"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    }),
    [searchParams],
  );

  const hasActiveFilters = FILTER_PARAMS.some((key) => searchParams.get(key) !== null);

  const serverFilters = useMemo<FeedbucketSubmissionFilters>(
    () => ({
      widgetId,
      ...(filterValues.status ? { status: filterValues.status } : {}),
      ...(filterValues.type ? { type: filterValues.type } : {}),
      ...(filterValues.linked ? { linked: filterValues.linked } : {}),
      ...(filterValues.assigneeId ? { assigneeId: filterValues.assigneeId } : {}),
      ...(filterValues.search ? { search: filterValues.search } : {}),
      ...(filterValues.from ? { from: filterValues.from } : {}),
      ...(filterValues.to ? { to: filterValues.to } : {}),
    }),
    [widgetId, filterValues],
  );

  const handleFilterChange = useCallback(
    (key: keyof SubmissionInboxFilterValues, value: string | null) => {
      resetWalk();
      setSelected(new Set());
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => {
        router.replace(
          params.toString() ? `${pathname}?${params.toString()}` : pathname,
          { scroll: false },
        );
      });
    },
    [pathname, router, searchParams, resetWalk],
  );

  function handleClearFilters() {
    resetWalk();
    setSelected(new Set());
    const params = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_PARAMS) params.delete(key);
    startTransition(() => {
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false },
      );
    });
  }

  const { data, isLoading, isError, refetch } = useFeedbucketSubmissions({
    limit: PAGE_SIZE,
    ...(walk.cursor ? { cursor: walk.cursor } : {}),
    ...serverFilters,
  });

  const rows = useMemo(() => data?.data ?? [], [data]);

  function handleRowClick(row: SubmissionRow) {
    router.push(`/build/${projectId}/feedbucket/${row.id}`);
  }

  function handleRetry() {
    void refetch();
  }

  function handleNextPage() {
    setSelected(new Set());
    walk.goNext(data?.pagination.nextCursor);
  }

  function handlePreviousPage() {
    setSelected(new Set());
    walk.goPrevious();
  }

  const handleClearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleRequestDelete = useCallback((submissionId: number) => {
    setPendingDeleteId(submissionId);
  }, []);

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setPendingDeleteId(null);
  }

  function handleConfirmDelete() {
    if (pendingDeleteId === null) return;
    deleteSubmission.mutate(
      { submissionId: pendingDeleteId },
      {
        onSuccess: () => {
          toast.success("Submission deleted");
          setPendingDeleteId(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  const columns = useMemo<DataTableColumn<SubmissionRow>[]>(() => {
    if (!canDelete) return SUBMISSION_COLUMNS;
    function renderDelete(row: SubmissionRow) {
      return (
        <DeleteSubmissionButton submissionId={row.id} onRequestDelete={handleRequestDelete} />
      );
    }
    return [
      ...SUBMISSION_COLUMNS,
      { key: "actions", header: "", cell: renderDelete, className: "w-8" },
    ];
  }, [canDelete, handleRequestDelete]);

  const selectedIds = useMemo(
    () => [...selected].map(Number).filter((id) => Number.isFinite(id)),
    [selected],
  );

  const selectionEnabled = canUpdate || canDelete;

  if (isLoading) {
    return (
      <div className="flex flex-1 min-h-0 h-full flex-col gap-2 p-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={`submission-skeleton-${index}`} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className="flex flex-1 min-h-0 h-full"
        description="Failed to load submissions."
        onRetry={handleRetry}
      />
    );
  }

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
      <SubmissionInboxFilters values={filterValues} onChange={handleFilterChange} />

      {selectedIds.length > 0 ? (
        <SubmissionBulkToolbar
          selectedIds={selectedIds}
          filters={serverFilters}
          onClearSelection={handleClearSelection}
        />
      ) : null}

      <DataTable
        data={rows}
        columns={columns}
        getRowKey={getSubmissionRowKey}
        onRowClick={handleRowClick}
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
        className="flex flex-1 min-h-0 h-full border-0 rounded-none"
        emptyState={hasActiveFilters ? filteredEmptyState : firstRunEmptyState}
        rowClassName={submissionRowClassName}
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
