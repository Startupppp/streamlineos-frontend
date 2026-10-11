import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useManagedProducts } from "@/hooks/api/build/managed-products";
import { useCan } from "@/hooks/api/access";
import type { ManagedProduct } from "@/types/projects";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { buildManagedProductColumns } from "./managed-product-table-columns";
import { PAGE_SIZE, FILTER_DEFINITIONS } from "./managed-products-filter-constants";
import { useManagedProductFilterOptions } from "./use-managed-product-filter-options";
import { useManagedProductMutations } from "./use-managed-product-mutations";

function positiveId(value: string | undefined): string | undefined {
  if (!value || value === BUILD_FILTER_ALL || !/^\d+$/.test(value)) return undefined;
  return Number(value) > 0 ? value : undefined;
}

function trimmedText(value: string | undefined): string | undefined {
  if (!value || value === BUILD_FILTER_ALL) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function useManagedProductsPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const canCreate = useCan("build:managed-products:create");
  const canUpdate = useCan("build:managed-products:update");
  const canDelete = useCan("build:managed-products:delete");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const { cursor, pageNumber, hasPrevious, goNext, goPrevious } =
    useBuildCursorPager(listFilters.resetKey);

  const {
    open: createOpen,
    onOpenChange: setCreateOpen,
    setOpen: openCreate,
  } = useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<ManagedProduct | null>(null);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const statusValue = listFilters.value("status");
  const sortValue = listFilters.value("sort");
  const ownerIdValue = listFilters.value("ownerId");
  const lifecycleValue = listFilters.value("lifecycle");
  const healthValue = listFilters.value("health");
  const teamIdValue = listFilters.value("teamId");
  const segmentValue = listFilters.value("segment");
  const tagValue = listFilters.value("tag");
  const linkedProjectIdValue = listFilters.value("linkedProjectId");
  const archivedValue = listFilters.value("archived");

  const { data, isLoading, isError, error, refetch } = useManagedProducts({
    cursor,
    limit: PAGE_SIZE,
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    search: listFilters.debouncedSearch.trim() || undefined,
    ownerId: trimmedText(ownerIdValue),
    sort:
      sortValue &&
      sortValue !== BUILD_FILTER_ALL &&
      (sortValue === "name" || sortValue === "updated" || sortValue === "status")
        ? sortValue
        : undefined,
    lifecycle: lifecycleValue !== BUILD_FILTER_ALL ? lifecycleValue : undefined,
    health: healthValue !== BUILD_FILTER_ALL ? healthValue : undefined,
    teamId: positiveId(teamIdValue),
    segment: trimmedText(segmentValue),
    tag: trimmedText(tagValue),
    linkedProjectId: positiveId(linkedProjectIdValue),
    archived: archivedValue === "true" ? true : undefined,
  });

  const { teamOptions, ownerOptions, segmentOptions, tagOptions, linkedProjectOptions, ownerOf } =
    useManagedProductFilterOptions();

  const onCreateSuccess = useCallback(() => {
    setCreateOpen(false);
  }, [setCreateOpen]);

  const {
    deleteTarget,
    archiveTarget,
    createProductIsPending,
    handleCreate,
    handleDeleteConfirm,
    handleArchiveConfirm,
    handleRestoreRow,
    handleDeleteRow,
    handleArchiveRow,
    handleDeleteDialogChange,
    handleArchiveDialogChange,
  } = useManagedProductMutations({ canCreate, canUpdate, canDelete, onCreateSuccess });

  const handleOpenCreate = useCallback(() => {
    if (canCreate) openCreate();
  }, [canCreate, openCreate]);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setCreateOpen(false);
        setEditTarget(null);
      }
    },
    [setCreateOpen],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const displayed = useMemo(() => data?.data ?? [], [data]);

  const handleOpenFocused = useCallback(
    (index: number) => {
      const product = displayed[index];
      if (product) {
        router.push(`/build/managed-products/${product.id}`);
      }
    },
    [displayed, router],
  );

  const handleClearKeyboardSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleEditFocused = useCallback(
    (index: number) => {
      const product = displayed[index];
      if (canUpdate && product) setEditTarget(product);
    },
    [canUpdate, displayed],
  );

  const selectedIds = useMemo(
    () => [...selected].map(Number).filter((id) => Number.isFinite(id)),
    [selected],
  );

  useBuildListKeyboard({
    itemCount: displayed.length,
    onOpen: handleOpenFocused,
    onEdit: canUpdate ? handleEditFocused : undefined,
    onCreate: canCreate ? handleOpenCreate : undefined,
    onClearSelection: handleClearKeyboardSelection,
    searchInputRef,
    enabled: !createOpen && !editTarget && !deleteTarget,
  });

  const handleEditRow = useCallback(
    (row: ManagedProduct) => {
      if (canUpdate) setEditTarget(row);
    },
    [canUpdate],
  );

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  const columns = useMemo(
    () =>
      buildManagedProductColumns({
        canUpdate,
        canDelete,
        ownerOf,
        onEdit: handleEditRow,
        onDelete: handleDeleteRow,
        onArchive: handleArchiveRow,
        onRestore: handleRestoreRow,
      }),
    [canDelete, canUpdate, handleDeleteRow, handleEditRow, handleArchiveRow, handleRestoreRow, ownerOf],
  );

  return {
    canCreate,
    canUpdate,
    canDelete,
    listFilters,
    pageNumber,
    hasPrevious,
    goPrevious,
    createOpen,
    setCreateOpen,
    editTarget,
    setEditTarget,
    deleteTarget,
    archiveTarget,
    selected,
    setSelected,
    teamOptions,
    ownerOptions,
    segmentOptions,
    tagOptions,
    linkedProjectOptions,
    displayed,
    data,
    isLoading,
    isError,
    error,
    createProductIsPending,
    ownerOf,
    selectedIds,
    searchInputRef,
    handleCreate,
    handleDeleteConfirm,
    handleArchiveConfirm,
    handleOpenCreate,
    handleSheetOpenChange,
    handleDeleteDialogChange,
    handleArchiveDialogChange,
    handleRetry,
    handleClearKeyboardSelection,
    handleNextPage,
    handleEditRow,
    handleDeleteRow,
    handleArchiveRow,
    columns,
  };
}
