"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import {
  useDeleteFeedbucketSubmission,
  useFeedbucketSubmissions,
} from "@/hooks/api/feedbucket";
import { getErrorMessage } from "@/lib/get-error-message";
import type { FeedbucketSubmissionFilters } from "@/types/feedbucket";
import { ALL_TYPES, ALL_STATUSES } from "./feedbucket-constants";
import { buildSubmissionColumnsWithLinkedTicket } from "./submission-inbox-columns";
import type { SubmissionInboxFilterValues } from "./submission-inbox-filters";

const PAGE_SIZE = 25;

const FILTER_PARAMS = [
  "status",
  "type",
  "linked",
  "duplicate",
  "assigneeId",
  "search",
  "from",
  "to",
] as const;

export { PAGE_SIZE };

interface UseProjectSubmissionsInboxParams {
  widgetId: number;
  projectId: number;
}

export function useProjectSubmissionsInbox({
  widgetId,
  projectId,
}: UseProjectSubmissionsInboxParams) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const walk = useCursorPagination();
  const deleteSubmission = useDeleteFeedbucketSubmission();
  const canDelete = useCan("feedbucket:submissions:delete");
  const canUpdate = useCan("feedbucket:submissions:update");
  const { reset: resetWalk } = walk;

  const filterValues = useMemo<SubmissionInboxFilterValues>(() => {
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");
    const linkedParam = searchParams.get("linked");
    return {
      status: ALL_STATUSES.find((status) => status === statusParam) ?? null,
      type: ALL_TYPES.find((type) => type === typeParam) ?? null,
      linked:
        linkedParam === "linked" || linkedParam === "unlinked"
          ? linkedParam
          : null,
      duplicate: (() => {
        const v = searchParams.get("duplicate");
        return v === "true" || v === "false" ? v : null;
      })(),
      assigneeId: searchParams.get("assigneeId"),
      search: searchParams.get("search"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    };
  }, [searchParams]);

  const hasActiveFilters = FILTER_PARAMS.some(
    (key) => searchParams.get(key) !== null,
  );

  const serverFilters = useMemo<FeedbucketSubmissionFilters>(
    () => ({
      widgetId,
      ...(filterValues.status ? { status: filterValues.status } : {}),
      ...(filterValues.type ? { type: filterValues.type } : {}),
      ...(filterValues.linked ? { linked: filterValues.linked } : {}),
      ...(filterValues.duplicate ? { duplicate: filterValues.duplicate } : {}),
      ...(filterValues.assigneeId
        ? { assigneeId: filterValues.assigneeId }
        : {}),
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

  const { data, isLoading, isError, error, refetch } = useFeedbucketSubmissions(
    {
      limit: PAGE_SIZE,
      ...(walk.cursor ? { cursor: walk.cursor } : {}),
      ...serverFilters,
    },
  );

  const rows = useMemo(() => data?.data ?? [], [data]);

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
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  const baseColumns = useMemo(
    () => buildSubmissionColumnsWithLinkedTicket(projectId),
    [projectId],
  );

  const selectedIds = useMemo(
    () => [...selected].map(Number).filter((id) => Number.isFinite(id)),
    [selected],
  );

  const selectionEnabled = canUpdate || canDelete;

  function handleNextPage() {
    setSelected(new Set());
    walk.goNext(data?.pagination.nextCursor);
  }

  function handlePreviousPage() {
    setSelected(new Set());
    walk.goPrevious();
  }

  function handleRetry() {
    void refetch();
  }

  return {
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
  };
}
