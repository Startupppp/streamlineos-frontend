"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { useManagedProductProjects, type LinkedProjectRow } from "@/hooks/api/build/managed-product-projects";
import { useUnlinkProjectManagedProduct } from "@/hooks/api/build/use-link-project-managed-product";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useQueryClient } from "@tanstack/react-query";

export { type LinkedProjectRow };

export const PAGE_SIZE = 20;
const CURSOR_PARAM = "cursor";
const STATUS_PARAM = "pp_status";
const HEALTH_PARAM = "pp_health";
const OWNER_PARAM = "pp_owner";
const DATE_FROM_PARAM = "pp_dateFrom";
const DATE_TO_PARAM = "pp_dateTo";
const SEARCH_PARAM = "pp_search";

const LINK_PROJECT_ACTION = {
  id: "link-project",
  label: "Link existing project",
  icon: Link2,
  primary: false as const,
};

interface UseProductProjectsPageProps {
  managedProductId: number;
}

export function useProductProjectsPage({ managedProductId }: UseProductProjectsPageProps) {
  const queryClient = useQueryClient();
  const canManage = useCan("build:managed-products:update");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [unlinkProjectId, setUnlinkProjectId] = useState<number | null>(null);

  const statusValue = searchParams.get(STATUS_PARAM) ?? "";
  const healthValue = searchParams.get(HEALTH_PARAM) ?? "";
  const ownerValue = searchParams.get(OWNER_PARAM) ?? "";
  const dateFromValue = searchParams.get(DATE_FROM_PARAM) ?? "";
  const dateToValue = searchParams.get(DATE_TO_PARAM) ?? "";
  const searchValue = searchParams.get(SEARCH_PARAM) ?? "";
  const cursorValue = searchParams.get(CURSOR_PARAM) ?? undefined;

  const debouncedSearch = useDebouncedValue(searchValue, 300);

  const isFiltered = Boolean(
    statusValue || healthValue || ownerValue || dateFromValue || dateToValue || searchValue,
  );

  const params = useMemo(
    () => ({
      managedProductId,
      limit: PAGE_SIZE,
      cursor: cursorValue,
      ...(statusValue ? { status: statusValue } : {}),
      ...(ownerValue ? { ownerId: Number(ownerValue) } : {}),
      ...(dateFromValue ? { dateFrom: dateFromValue } : {}),
      ...(dateToValue ? { dateTo: dateToValue } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [managedProductId, cursorValue, statusValue, ownerValue, dateFromValue, dateToValue, debouncedSearch],
  );

  const { data, isLoading, isError, error, refetch } = useManagedProductProjects(params);

  const rows = useMemo(() => data?.data ?? [], [data]);
  const hasMore = data?.pagination.hasMore ?? false;
  const nextCursor = data?.pagination.nextCursor ?? null;
  const hasPrevious = Boolean(cursorValue);

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: rows.length === 0,
  });

  const isFilteredEmpty = !isLoading && rows.length === 0 && isFiltered;

  function writeParams(updates: Record<string, string | null>, resetCursor = false) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetCursor) next.delete(CURSOR_PARAM);
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  const handleStatusChange = useCallback(
    (value: string) => writeParams({ [STATUS_PARAM]: value || null }, true),
    [searchParams, pathname, router],
  );

  const handleHealthChange = useCallback(
    (value: string) => writeParams({ [HEALTH_PARAM]: value || null }, true),
    [searchParams, pathname, router],
  );

  const handleOwnerChange = useCallback(
    (value: string) => writeParams({ [OWNER_PARAM]: value || null }, true),
    [searchParams, pathname, router],
  );

  const handleDateFromChange = useCallback(
    (value: string) => writeParams({ [DATE_FROM_PARAM]: value || null }, true),
    [searchParams, pathname, router],
  );

  const handleDateToChange = useCallback(
    (value: string) => writeParams({ [DATE_TO_PARAM]: value || null }, true),
    [searchParams, pathname, router],
  );

  const handleSearchChange = useCallback(
    (value: string) => writeParams({ [SEARCH_PARAM]: value || null }, true),
    [searchParams, pathname, router],
  );

  const handleClearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    for (const p of [STATUS_PARAM, HEALTH_PARAM, OWNER_PARAM, DATE_FROM_PARAM, DATE_TO_PARAM, SEARCH_PARAM, CURSOR_PARAM]) {
      next.delete(p);
    }
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [searchParams, pathname, router]);

  const handleNextPage = useCallback(() => {
    if (nextCursor) writeParams({ [CURSOR_PARAM]: nextCursor });
  }, [nextCursor, searchParams, pathname, router]);

  const handlePreviousPage = useCallback(() => {
    writeParams({ [CURSOR_PARAM]: null });
  }, [searchParams, pathname, router]);

  const unlinkMutation = useUnlinkProjectManagedProduct();

  const handleUnlinkClick = useCallback(
    (row: LinkedProjectRow) => {
      if (canManage) setUnlinkProjectId(row.id);
    },
    [canManage],
  );

  const handleUnlinkConfirm = useCallback(() => {
    if (!unlinkProjectId) return;
    unlinkMutation.mutate(
      { projectId: unlinkProjectId, managedProductId },
      {
        onSuccess: () => {
          toast.success("Project unlinked from product");
          setUnlinkProjectId(null);
          queryClient.invalidateQueries({
            queryKey: buildWorkQueryKeys.projects.managedProducts.linkedProjects(managedProductId),
            exact: false,
            refetchType: "active",
          });
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [unlinkProjectId, unlinkMutation, managedProductId, queryClient]);

  const handleUnlinkDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setUnlinkProjectId(null);
  }, []);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const headerActions = useMemo(
    () =>
      canManage
        ? [{ ...LINK_PROJECT_ACTION, onSelect: () => setLinkDialogOpen(true) }]
        : [],
    [canManage],
  );

  return {
    canManage,
    rows,
    hasMore,
    hasPrevious,
    nextCursor,
    resolution,
    isFiltered,
    isFilteredEmpty,
    isLoading,
    statusValue,
    healthValue,
    ownerValue,
    dateFromValue,
    dateToValue,
    searchValue,
    searchInputRef,
    linkDialogOpen,
    setLinkDialogOpen,
    unlinkProjectId,
    unlinkMutation,
    headerActions,
    handleStatusChange,
    handleHealthChange,
    handleOwnerChange,
    handleDateFromChange,
    handleDateToChange,
    handleSearchChange,
    handleClearFilters,
    handleNextPage,
    handlePreviousPage,
    handleUnlinkClick,
    handleUnlinkConfirm,
    handleUnlinkDialogOpenChange,
    handleRetry,
  };
}
