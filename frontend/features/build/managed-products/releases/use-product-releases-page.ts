"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useInfiniteManagedProductReleases,
  useUpdateManagedProductRelease,
} from "@/hooks/api/build/managed-product-releases";
import type {
  ManagedProductRelease,
  UpdateManagedProductReleaseInput,
} from "@/hooks/api/build/managed-product-releases";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { getTodayString } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { groupReleases, RELEASE_VIEWS } from "./product-releases-model";
import type { ReleaseView } from "./product-releases-model";
import type { ReleaseActions } from "./release-actions-context";

const RELEASES_PAGE_LIMIT = 100;

const RELEASE_VIEW_FILTERS = [
  { param: "view", all: "active", options: RELEASE_VIEWS },
] as const;

type LifecycleAction = "archive" | "restore";

interface LifecycleTarget {
  release: ManagedProductRelease;
  action: LifecycleAction;
}

export function useProductReleasesPage(managedProductId: number) {
  const filters = useBuildListFilters({
    withSearch: false,
    filters: RELEASE_VIEW_FILTERS,
  });
  const view: ReleaseView =
    filters.value("view") === "archived" ? "archived" : "active";
  const { setValue } = filters;

  const query = useInfiniteManagedProductReleases(managedProductId, {
    limit: RELEASES_PAGE_LIMIT,
  });
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = query;
  const rows = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );
  const groups = useMemo(() => groupReleases(rows, getTodayString()), [rows]);

  const resolution = usePageState({
    error,
    isError,
    isLoading,
    isEmpty: groups.total === 0,
    permission: "build:managed-products:view",
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<
    ManagedProductRelease | undefined
  >(undefined);
  const [lifecycleTarget, setLifecycleTarget] =
    useState<LifecycleTarget | null>(null);
  const [detailReleaseId, setDetailReleaseId] = useState<number | null>(null);

  const updateRelease = useUpdateManagedProductRelease(managedProductId);
  const { mutate: mutateRelease } = updateRelease;
  const pendingReleaseId = updateRelease.isPending
    ? (updateRelease.variables?.releaseId ?? null)
    : null;

  const runUpdate = useCallback(
    (
      input: UpdateManagedProductReleaseInput,
      successMessage: string,
      onDone?: () => void,
    ) => {
      mutateRelease(input, {
        onSuccess: () => {
          toast.success(successMessage);
          onDone?.();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [mutateRelease],
  );

  const handleCreate = useCallback(() => {
    setEditTarget(undefined);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((release: ManagedProductRelease) => {
    setEditTarget(release);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(undefined);
  }, []);

  const handleMarkReleased = useCallback(
    (release: ManagedProductRelease) => {
      if (!release.allowedActions.includes("update")) return;
      runUpdate(
        {
          releaseId: release.id,
          expectedRevision: release.recordRevision,
          status: "released",
          releaseDate: release.releaseDate ?? getTodayString(),
        },
        `Marked ${release.name} as released.`,
      );
    },
    [runUpdate],
  );

  const handleArchive = useCallback((release: ManagedProductRelease) => {
    if (!release.allowedActions.includes("archive")) return;
    setLifecycleTarget({ release, action: "archive" });
  }, []);

  const handleRestore = useCallback((release: ManagedProductRelease) => {
    if (!release.allowedActions.includes("restore")) return;
    setLifecycleTarget({ release, action: "restore" });
  }, []);

  const handleLifecycleOpenChange = useCallback((open: boolean) => {
    if (!open) setLifecycleTarget(null);
  }, []);

  const handleLifecycleConfirm = useCallback(() => {
    if (!lifecycleTarget) return;
    const { release, action } = lifecycleTarget;
    const closeDialog = () => setLifecycleTarget(null);
    if (action === "archive") {
      runUpdate(
        {
          releaseId: release.id,
          expectedRevision: release.recordRevision,
          status: "archived",
        },
        `Archived ${release.name}.`,
        closeDialog,
      );
    } else {
      runUpdate(
        {
          releaseId: release.id,
          expectedRevision: release.recordRevision,
          status: "draft",
        },
        `Restored ${release.name} as a draft.`,
        closeDialog,
      );
    }
  }, [lifecycleTarget, runUpdate]);

  const handleViewDetails = useCallback((release: ManagedProductRelease) => {
    setDetailReleaseId(release.id);
  }, []);

  const handleDetailOpenChange = useCallback((open: boolean) => {
    if (!open) setDetailReleaseId(null);
  }, []);

  const handleViewChange = useCallback(
    (next: string) => setValue("view", next),
    [setValue],
  );
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const canUpdate = useCan("build:managed-products:update");

  const actions = useMemo<ReleaseActions>(
    () => ({
      canUpdate,
      pendingReleaseId,
      onEdit: handleEdit,
      onCreate: handleCreate,
      onArchive: handleArchive,
      onRestore: handleRestore,
      onViewDetails: handleViewDetails,
      onMarkReleased: handleMarkReleased,
    }),
    [
      canUpdate,
      handleEdit,
      pendingReleaseId,
      handleCreate,
      handleArchive,
      handleRestore,
      handleViewDetails,
      handleMarkReleased,
    ],
  );

  return {
    view,
    groups,
    actions,
    sheetOpen,
    canUpdate,
    resolution,
    editTarget,
    lifecycleTarget,
    detailReleaseId,
    isFetchingNextPage,
    hasMore: hasNextPage,
    isLifecyclePending: updateRelease.isPending,
    handleRetry,
    handleCreate,
    handleLoadMore,
    handleViewChange,
    handleSheetOpenChange,
    handleLifecycleConfirm,
    handleDetailOpenChange,
    handleLifecycleOpenChange,
  };
}
