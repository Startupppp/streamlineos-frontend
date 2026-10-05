import { useState, useCallback, useMemo, useRef, type MouseEvent } from "react";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { useReleases, useDeleteRelease } from "@/hooks/api/build/releases";
import type { Release } from "@/types/projects";
import { useCan } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import {
  RELEASE_FILTER_DEFINITIONS,
  isReleaseStatus,
  readDateFilter,
} from "./releases-page-model";

export function useReleasesPage(projectId: number) {
  const listFilters = useBuildListFilters({ filters: RELEASE_FILTER_DEFINITIONS });
  const pager = useBuildCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const statusFilterValue = listFilters.value("status");
  const serverStatus = isReleaseStatus(statusFilterValue) ? statusFilterValue : undefined;
  const fromValue = readDateFilter(listFilters.value("from"));
  const toValue = readDateFilter(listFilters.value("to"));

  const { data, isLoading, isError, error, refetch } = useReleases(projectId, {
    cursor: pager.cursor,
    status: serverStatus,
    q: listFilters.debouncedSearch || undefined,
    from: fromValue,
    to: toValue,
  });

  const canManage = useCan("build:manage");
  const isOnline = useOnlineStatus();
  const deleteRelease = useDeleteRelease(projectId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Release | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Release | null>(null);
  const [contextTarget, setContextTarget] = useState<{
    release: Release;
    x: number;
    y: number;
  } | null>(null);

  const releases = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;

  const stats = useMemo(
    () => ({
      total: releases.length,
      released: releases.filter((r) => r.status === "released").length,
      draft: releases.filter((r) => r.status === "draft").length,
      archived: releases.filter((r) => r.status === "archived").length,
    }),
    [releases],
  );

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((r: Release) => {
    setEditTarget(r);
    setSheetOpen(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    setEditTarget(null);
  }, []);

  const handleDeleteTarget = useCallback((r: Release) => setDeleteTarget(r), []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteRelease.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Release deleted");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deleteTarget, deleteRelease]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleRowContextMenu = useCallback(
    (row: Release, event: MouseEvent) => {
      if (!canManage) return;
      event.preventDefault();
      setContextTarget({ release: row, x: event.clientX, y: event.clientY });
    },
    [canManage],
  );

  const handleContextMenuOpenChange = useCallback((open: boolean) => {
    if (!open) setContextTarget(null);
  }, []);

  const handleContextEdit = useCallback(() => {
    if (!contextTarget) return;
    handleOpenEdit(contextTarget.release);
    setContextTarget(null);
  }, [contextTarget, handleOpenEdit]);

  const handleContextDelete = useCallback(() => {
    if (!contextTarget) return;
    setDeleteTarget(contextTarget.release);
    setContextTarget(null);
  }, [contextTarget]);

  const handleStatusFilterChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      listFilters.setValue("from", range.from);
      listFilters.setValue("to", range.to);
    },
    [listFilters],
  );

  const handleClearSelection = useCallback(() => {
    setContextTarget(null);
  }, []);

  const handleOpenByIndex = useCallback(
    (index: number) => {
      const row = releases[index];
      if (row) handleOpenEdit(row);
    },
    [releases, handleOpenEdit],
  );

  const handleEditByIndex = useCallback(
    (index: number) => {
      const row = releases[index];
      if (row) handleOpenEdit(row);
    },
    [releases, handleOpenEdit],
  );

  useBuildListKeyboard({
    itemCount: releases.length,
    onOpen: handleOpenByIndex,
    onEdit: handleEditByIndex,
    onCreate: handleOpenCreate,
    onClearSelection: handleClearSelection,
    searchInputRef,
  });

  return {
    listFilters,
    pager,
    searchInputRef,
    statusFilterValue,
    fromValue,
    toValue,
    releases,
    pagination,
    stats,
    isLoading,
    isError,
    error,
    canManage,
    isOnline,
    sheetOpen,
    editTarget,
    deleteTarget,
    contextTarget,
    deleteRelease,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseSheet,
    handleDeleteTarget,
    handleAlertOpenChange,
    handleConfirmDelete,
    handleRetry,
    handleRowContextMenu,
    handleContextMenuOpenChange,
    handleContextEdit,
    handleContextDelete,
    handleStatusFilterChange,
    handleDateRangeChange,
  };
}
