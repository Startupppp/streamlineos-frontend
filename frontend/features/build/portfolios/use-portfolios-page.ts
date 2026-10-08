"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  usePortfolios,
  useCreatePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
} from "@/hooks/api/build/portfolios";
import { useCan } from "@/hooks/api/access";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { PORTFOLIO_FILTER_DEFINITIONS } from "./portfolios-toolbar";
import type {
  Portfolio,
  CreatePortfolioInput,
  UpdatePortfolioInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import type { NamedUser } from "@/lib/person-display";

export const PAGE_SIZE = 20;

export function usePortfoliosPage() {
  const canManage = useCan("build:portfolios:manage");
  const listFilters = useBuildListFilters({ filters: PORTFOLIO_FILTER_DEFINITIONS });
  const { cursor, pageNumber, hasPrevious, goNext, goPrevious } = useBuildCursorPager(
    listFilters.resetKey,
  );

  const {
    open: createOpen,
    onOpenChange: setCreateOpen,
    setOpen: openCreate,
  } = useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<Portfolio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null);

  const statusValue = listFilters.value("status");
  const healthValue = listFilters.value("health");
  const ownerIdValue = listFilters.value("ownerId");
  const sortValue = listFilters.value("sort");

  const { data, isLoading, isError, error, refetch } = usePortfolios({
    cursor,
    limit: PAGE_SIZE,
    search: listFilters.debouncedSearch.trim() || undefined,
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    health: healthValue !== BUILD_FILTER_ALL ? healthValue : undefined,
    ownerId: ownerIdValue !== BUILD_FILTER_ALL ? ownerIdValue : undefined,
    sort: sortValue !== BUILD_FILTER_ALL ? sortValue : undefined,
  });
  const { data: membersRes } = useBuildMembers({ limit: 100 });
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const ownerOptions = useMemo(
    () => members.map((m) => ({ value: m.id, label: m.name ?? m.email })),
    [members],
  );

  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  const ownerOf = useCallback(
    (ownerId: string | null): NamedUser | null => {
      if (!ownerId) return null;
      const match = members.find((member) => member.id === ownerId);
      return match ? { name: match.name, email: match.email } : null;
    },
    [members],
  );

  const rows = useMemo(() => data?.data ?? [], [data]);

  const handleCreate = useCallback(
    (input: CreatePortfolioInput) => {
      createPortfolio.mutate(input, {
        onSuccess: () => {
          toast.success("Portfolio created");
          setCreateOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createPortfolio, setCreateOpen],
  );

  const handleEdit = useCallback(
    (input: UpdatePortfolioInput & { portfolioId: number }) => {
      updatePortfolio.mutate(input, {
        onSuccess: () => {
          toast.success("Portfolio updated");
          setEditTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updatePortfolio],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deletePortfolio.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Portfolio deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deletePortfolio, deleteTarget]);

  const handleOpenCreate = useCallback(() => {
    openCreate();
  }, [openCreate]);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setCreateOpen(false);
        setEditTarget(null);
      }
    },
    [setCreateOpen],
  );

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEditRow = useCallback((row: Portfolio) => setEditTarget(row), []);
  const handleDeleteRow = useCallback(
    (row: Portfolio) => setDeleteTarget(row),
    [],
  );

  const handleClearSelection = useCallback(() => {}, []);
  const handleOpenByIndex = useCallback(
    (index: number) => {
      const row = rows[index];
      if (row) handleEditRow(row);
    },
    [rows, handleEditRow],
  );
  const handleEditByIndex = useCallback(
    (index: number) => {
      const row = rows[index];
      if (row && canManage) handleEditRow(row);
    },
    [rows, canManage, handleEditRow],
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  useBuildListKeyboard({
    itemCount: rows.length,
    onOpen: handleOpenByIndex,
    onEdit: handleEditByIndex,
    onCreate: handleOpenCreate,
    onClearSelection: handleClearSelection,
    searchInputRef,
  });

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  return {
    canManage,
    listFilters,
    data,
    rows,
    isLoading,
    isError,
    error,
    pageNumber,
    hasPrevious,
    goPrevious,
    members,
    ownerOptions,
    ownerOf,
    createOpen,
    editTarget,
    deleteTarget,
    createPortfolio,
    updatePortfolio,
    searchInputRef,
    handleCreate,
    handleEdit,
    handleDeleteConfirm,
    handleOpenCreate,
    handleSheetOpenChange,
    handleDeleteDialogChange,
    handleRetry,
    handleEditRow,
    handleDeleteRow,
    handleNextPage,
    PAGE_SIZE,
  };
}
