"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  useProjectTemplates,
  useDeleteProjectTemplate,
  type ProjectTemplate,
} from "@/hooks/api/build/templates";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import {
  useBuildListFilters,
  BUILD_FILTER_ALL,
} from "@/features/build/shared/use-build-list-filters";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { TEMPLATE_CATEGORY_OPTIONS } from "./template-categories";

const FILTER_DEFINITIONS = [
  {
    param: "category",
    options: TEMPLATE_CATEGORY_OPTIONS.map((option) => option.value),
  },
  { param: "sort", options: ["newest", "name"] },
] as const;

export function useBuildTemplatesPage() {
  const canManage = useCan("build:manage");
  const isOnline = useOnlineStatus();
  const searchRef = useRef<HTMLInputElement>(null);

  const listFilters = useBuildListFilters({
    filters: FILTER_DEFINITIONS,
    withSearch: true,
  });
  const categoryFilter = listFilters.value("category");
  const sortFilter = listFilters.value("sort");
  const searchDisplay = listFilters.search;
  const debouncedSearch = listFilters.debouncedSearch;
  const normalizedSearch = debouncedSearch.trim();
  const isFiltered = listFilters.activeCount > 0 || normalizedSearch.length > 0;

  const {
    data: templatePages,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isFetchingNextPage,
  } = useProjectTemplates({
    q: normalizedSearch || undefined,
    category: categoryFilter !== BUILD_FILTER_ALL ? categoryFilter : undefined,
    sort: sortFilter !== BUILD_FILTER_ALL ? sortFilter : undefined,
  });
  const deleteTemplate = useDeleteProjectTemplate();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<ProjectTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTemplate | null>(
    null,
  );

  const templates = useMemo(
    () => templatePages?.pages.flatMap((p) => p.data) ?? [],
    [templatePages],
  );

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handleApplyTarget = useCallback(
    (t: ProjectTemplate) => setApplyTarget(t),
    [],
  );
  const handleCloseApply = useCallback(() => setApplyTarget(null), []);
  const handleDeleteTarget = useCallback(
    (t: ProjectTemplate) => setDeleteTarget(t),
    [],
  );
  const handleCategoryChange = useCallback(
    (value: string) => listFilters.setValue("category", value),
    [listFilters],
  );
  const handleSortChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetching) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetching]);
  const handleKeyboardOpen = useCallback(
    (index: number) => {
      const t = templates[index];
      if (t) setApplyTarget(t);
    },
    [templates],
  );
  const handleKeyboardClear = useCallback(() => setApplyTarget(null), []);

  useBuildListKeyboard({
    itemCount: templates.length,
    onOpen: handleKeyboardOpen,
    onCreate: canManage ? handleOpenCreate : undefined,
    onClearSelection: handleKeyboardClear,
    searchInputRef: searchRef,
    enabled: pageState.kind === "ready",
  });

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteTemplate.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteTarget(null);
      },
      onError: (e) => {
        if (isApiError(e) && e.status === 409) {
          toast.info("Template was already modified. Refreshing…");
          void refetch();
          setDeleteTarget(null);
          return;
        }
        toast.error(getErrorMessage(e));
      },
    });
  }, [deleteTarget, deleteTemplate, refetch]);

  function handleRetry() {
    void refetch();
  }

  return {
    canManage,
    isOnline,
    searchRef,
    listFilters,
    categoryFilter,
    sortFilter,
    searchDisplay,
    isLoading,
    isError,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    templates,
    isFiltered,
    pageState,
    createOpen,
    applyTarget,
    deleteTarget,
    handleOpenCreate,
    handleCloseCreate,
    handleApplyTarget,
    handleCloseApply,
    handleDeleteTarget,
    handleCategoryChange,
    handleSortChange,
    handleLoadMore,
    handleDeleteDialogChange,
    handleDelete,
    handleRetry,
    isDeleting: deleteTemplate.isPending,
  };
}
