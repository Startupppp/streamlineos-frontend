"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  useRoadmapItems,
  useDeleteRoadmapItem,
  ROADMAP_SORTS,
  type RoadmapSort,
} from "@/hooks/api/build/roadmap";
import type { RoadmapHorizon, RoadmapStatus } from "@/types/projects/roadmap";
import { ROADMAP_STATUS_OPTIONS, ROADMAP_HORIZON_OPTIONS } from "./roadmap-constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useCursorPager } from "@/components/ui/table-pagination";
import type { ScorableRoadmapItem } from "./roadmap-item-card";

function toRoadmapStatus(s: string): RoadmapStatus | undefined {
  return ROADMAP_STATUS_OPTIONS.find((o) => o.value === s)?.value;
}

function toRoadmapHorizon(s: string): RoadmapHorizon | undefined {
  return ROADMAP_HORIZON_OPTIONS.find((o) => o.value === s)?.value;
}

function toRoadmapSort(s: string): RoadmapSort | undefined {
  return ROADMAP_SORTS.find((v) => v === s);
}

interface UseRoadmapTabParams {
  search: string;
  cursor?: string | null;
  onCursorChange?: (cursor: string | null) => void;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  status?: string;
  goalId?: number;
  releaseId?: number;
  teamId?: number;
  managedProductId?: number;
  sort?: string;
  projectId?: number;
  horizon?: string;
  ownerId?: number;
  onItemsChange?: (items: ScorableRoadmapItem[]) => void;
}

export function useRoadmapTab({
  search,
  cursor = null,
  onCursorChange = () => {},
  createOpen,
  onCreateOpenChange,
  status,
  managedProductId,
  sort,
  projectId,
  horizon,
  ownerId,
  goalId,
  releaseId,
  teamId,
  onItemsChange,
}: UseRoadmapTabParams) {
  const isOnline = useOnlineStatus();
  const sortValue = sort ? toRoadmapSort(sort) : undefined;
  const cursorResetKey = JSON.stringify([
    search.trim(),
    status,
    managedProductId,
    sortValue,
    projectId,
    horizon,
    ownerId,
    goalId,
    releaseId,
    teamId,
  ]);
  const pager = useCursorPager(cursorResetKey, {
    initialCursor: cursor ?? undefined,
    onCursorChange: (nextCursor) => onCursorChange(nextCursor ?? null),
  });
  const { data, isLoading, isError, error, refetch } = useRoadmapItems({
    ...(search.trim() ? { search: search.trim() } : {}),
    cursor: pager.cursor,
    ...(status ? { status: toRoadmapStatus(status) } : {}),
    ...(managedProductId !== undefined ? { managedProductId } : {}),
    ...(sortValue ? { sort: sortValue } : {}),
    ...(projectId !== undefined ? { projectId } : {}),
    ...(horizon ? { horizon: toRoadmapHorizon(horizon) } : {}),
    ...(ownerId !== undefined ? { ownerId } : {}),
    ...(goalId !== undefined ? { goalId } : {}),
    ...(releaseId !== undefined ? { releaseId } : {}),
    ...(teamId !== undefined ? { teamId } : {}),
  });
  const deleteItem = useDeleteRoadmapItem();
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScorableRoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScorableRoadmapItem | null>(null);

  const isEmpty = (data?.data ?? []).length === 0 && !pager.hasPrevious;
  const isFiltered = Boolean(
    search.trim() ||
    status ||
    managedProductId !== undefined ||
    projectId !== undefined ||
    horizon ||
    ownerId !== undefined ||
    goalId !== undefined ||
    releaseId !== undefined ||
    teamId !== undefined,
  );

  const resolution = usePageState({
    permission: "build:roadmap:view",
    isLoading,
    isError,
    error,
    isEmpty,
  });

  const isCreateControlled = onCreateOpenChange !== undefined;
  const sheetOpen = isCreateControlled
    ? (createOpen ?? false)
    : internalCreateOpen;

  const grouped = useMemo(() => {
    const map: Record<RoadmapHorizon, ScorableRoadmapItem[]> = {
      now: [],
      next: [],
      later: [],
    };
    for (const item of data?.data ?? []) {
      const h = item.horizon ?? "later";
      map[h].push(item);
    }
    return map;
  }, [data]);

  function handleRetry() {
    void refetch();
  }

  function handleOpenSheet() {
    if (isCreateControlled) onCreateOpenChange(true);
    else setInternalCreateOpen(true);
  }

  function handleCloseSheet() {
    if (isCreateControlled) onCreateOpenChange(false);
    else setInternalCreateOpen(false);
  }

  function handleCloseEdit() {
    setEditTarget(null);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  const handleEditItem = useCallback((item: ScorableRoadmapItem) => {
    setEditTarget(item);
  }, []);

  const handleDeleteItem = useCallback((item: ScorableRoadmapItem) => {
    setDeleteTarget(item);
  }, []);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Roadmap item deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const handleNext = useCallback(() => {
    pager.goNext(data?.pagination.nextCursor);
  }, [data?.pagination.nextCursor, pager]);

  const handlePrev = useCallback(() => {
    pager.goPrevious();
  }, [pager]);

  const hasNext = data?.pagination.hasMore ?? false;

  useEffect(() => {
    onItemsChange?.(data?.data ?? []);
  }, [data?.data, onItemsChange]);

  return {
    isOnline,
    resolution,
    grouped,
    data,
    sheetOpen,
    editTarget,
    deleteTarget,
    pager,
    hasNext,
    isFiltered,
    handleRetry,
    handleOpenSheet,
    handleCloseSheet,
    handleCloseEdit,
    handleDeleteDialogChange,
    handleEditItem,
    handleDeleteItem,
    handleDelete,
    handleNext,
    handlePrev,
  };
}
