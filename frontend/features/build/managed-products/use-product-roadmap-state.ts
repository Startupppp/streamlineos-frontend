"use client";

import { useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  useRoadmapItems,
  useDeleteRoadmapItem,
} from "@/hooks/api/build/roadmap";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import type { ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { ROADMAP_FILTER_DEFS, type RoadmapViewMode } from "./product-roadmap-model";
import type { RoadmapHorizon } from "@/types/projects";

export function useProductRoadmapState(managedProductId: number) {
  const canManage = useCan("build:roadmap:manage");
  const listFilters = useBuildListFilters({ filters: ROADMAP_FILTER_DEFS });
  const pager = useBuildCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const viewParam = searchParams.get("view");
  const viewMode: RoadmapViewMode =
    viewParam === "timeline"
      ? "timeline"
      : viewParam === "list"
        ? "list"
        : "board";

  const openItemId = searchParams.get("item")
    ? Number(searchParams.get("item"))
    : null;

  const { value: getFilter, debouncedSearch } = listFilters;

  const nv = (p: string) => {
    const x = getFilter(p);
    return x && x !== BUILD_FILTER_ALL ? x : undefined;
  };

  const filters = {
    managedProductId,
    status: nv("status"),
    horizon: nv("horizon"),
    search: debouncedSearch.trim() || undefined,
    sort: nv("sort"),
    teamId: nv("teamId"),
    goalId: nv("goalId"),
    segment: nv("segment")?.trim(),
    confidenceMin: nv("confidenceMin") ? Number(nv("confidenceMin")) : undefined,
    targetFrom: nv("targetFrom"),
    targetTo: nv("targetTo"),
    customerVisible: nv("customerVisible") ? nv("customerVisible") === "true" : undefined,
    evidenceState: nv("evidenceState"),
    cursor: pager.cursor,
  };

  const { data, isLoading, isError, error, refetch } = useRoadmapItems(filters);
  const deleteItem = useDeleteRoadmapItem();

  const [createOpen, setCreateOpen] = useState(false);
  const [createHorizon, setCreateHorizon] = useState<RoadmapHorizon>("later");
  const [editTarget, setEditTarget] = useState<ScorableRoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScorableRoadmapItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publicationOpen, setPublicationOpen] = useState(false);

  const grouped: Record<RoadmapHorizon, ScorableRoadmapItem[]> = {
    now: [],
    next: [],
    later: [],
  };
  for (const item of data?.data ?? []) {
    grouped[item.horizon ?? "later"].push(item);
  }

  const resolution = usePageState({
    permission: "build:roadmap:view",
    isLoading,
    isError,
    error,
    isEmpty:
      viewMode !== "board" &&
      (data?.data ?? []).length === 0 &&
      !pager.hasPrevious,
  });

  function handleViewItem(item: ScorableRoadmapItem) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("item", String(item.id));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }
  function handleEditItem(item: ScorableRoadmapItem) {
    setEditTarget(item);
  }
  function handleDeleteItem(item: ScorableRoadmapItem) {
    setDeleteTarget(item);
  }
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
  function handleNext() {
    pager.goNext(data?.pagination.nextCursor);
  }
  function handlePrev() {
    pager.goPrevious();
  }
  function handleRetry() {
    void refetch();
  }
  function handleOpenCreate() {
    setCreateHorizon("later");
    setCreateOpen(true);
  }
  function handleCloseCreate() {
    setCreateOpen(false);
  }
  function handleCloseEdit() {
    setEditTarget(null);
  }
  function handleDeleteOpenChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }
  function handleOpenPreview() {
    setPreviewOpen(true);
  }
  function handleClosePreview() {
    setPreviewOpen(false);
  }
  function handleOpenPublication() {
    setPublicationOpen(true);
  }
  function handleClosePublication() {
    setPublicationOpen(false);
  }
  function handleSetView(mode: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (mode === "board") next.delete("view");
    else next.set("view", mode);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  function handleCreateInHorizon(horizon: RoadmapHorizon) {
    setCreateHorizon(horizon);
    setCreateOpen(true);
  }

  useBuildListKeyboard({
    itemCount: (data?.data ?? []).length,
    onOpen: (index) => {
      const item = data?.data[index];
      if (item) handleViewItem(item);
    },
    onClearSelection: () => undefined,
    searchInputRef,
    enabled: !createOpen && !editTarget && !deleteTarget,
  });

  const hasNext = data?.pagination.hasMore ?? false;
  const allItems = data?.data ?? [];

  return {
    canManage,
    listFilters,
    pager,
    searchInputRef,
    viewMode,
    openItemId,
    data,
    isLoading,
    isError,
    resolution,
    createOpen,
    createHorizon,
    editTarget,
    deleteTarget,
    previewOpen,
    publicationOpen,
    grouped,
    hasNext,
    allItems,
    handleViewItem,
    handleEditItem,
    handleDeleteItem,
    handleDelete,
    handleNext,
    handlePrev,
    handleRetry,
    handleOpenCreate,
    handleCloseCreate,
    handleCloseEdit,
    handleDeleteOpenChange,
    handleOpenPreview,
    handleClosePreview,
    handleOpenPublication,
    handleClosePublication,
    handleSetView,
    handleCreateInHorizon,
  };
}
