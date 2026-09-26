"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import {
  usePortfolios,
  useCreatePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCursorPager } from "@/components/ui/table-pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PortfolioFormSheet } from "./portfolio-form-sheet";
import type {
  Portfolio,
  CreatePortfolioInput,
  UpdatePortfolioInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { PORTFOLIO_FILTER_DEFINITIONS, PortfoliosToolbar } from "./portfolios-toolbar";
import type { NamedUser } from "@/lib/person-display";
import {
  PORTFOLIO_TABLE_HEADERS,
  PortfolioMobileCard,
  buildPortfolioColumns,
} from "./portfolio-table-columns";

const PAGE_SIZE = 20;

export function PortfoliosPage() {
  const canManage = useCan("build:portfolios:manage");
  const listFilters = useBuildListFilters({ filters: PORTFOLIO_FILTER_DEFINITIONS });
  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(
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
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const ownerOptions = useMemo(
    () => members.map((m) => ({ value: m.userId, label: m.name ?? m.email })),
    [members],
  );

  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  const ownerOf = useCallback(
    (ownerId: string | null): NamedUser | null => {
      if (!ownerId) return null;
      const match = members.find((member) => member.userId === ownerId);
      return match ? { name: match.name, email: match.email } : null;
    },
    [members],
  );

  const rows = useMemo(() => data?.data ?? [], [data]);
  const displayed = rows;

  const resolution = usePageState({
    permission: "build:portfolios:view",
    isLoading,
    isError,
    error,
    isEmpty: displayed.length === 0,
  });

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
      const row = displayed[index];
      if (row) handleEditRow(row);
    },
    [displayed, handleEditRow],
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  useBuildListKeyboard({
    itemCount: displayed.length,
    onOpen: handleOpenByIndex,
    onCreate: handleOpenCreate,
    onClearSelection: handleClearSelection,
    searchInputRef,
  });

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  const columns = useMemo(
    () =>
      buildPortfolioColumns({
        canManage,
        ownerOf,
        onEdit: handleEditRow,
        onDelete: handleDeleteRow,
      }),
    [canManage, handleDeleteRow, handleEditRow, ownerOf],
  );

  const renderMobileCard = useCallback(
    (row: Portfolio) => (
      <PortfolioMobileCard
        portfolio={row}
        canManage={canManage}
        ownerOf={ownerOf}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
      />
    ),
    [canManage, handleDeleteRow, handleEditRow, ownerOf],
  );

  return (
    <PageWrapper
      title="Portfolios"
      subtitle="Group related projects into portfolios"
      filters={
        <PortfoliosToolbar listFilters={listFilters} ownerOptions={ownerOptions} searchInputRef={searchInputRef} />
      }
      actions={
        <BuildHeaderActions
          actions={
            canManage
              ? [
                  {
                    id: "create",
                    label: "New portfolio",
                    icon: Plus,
                    primary: true,
                    onSelect: handleOpenCreate,
                  },
                ]
              : []
          }
        />
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <PageState
            resolution={resolution}
            loading={
              <DataTableSkeleton mobileCards
                rows={12}
                headers={PORTFOLIO_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="projects"
                title="No portfolios yet"
                description="Create a portfolio to group and govern your projects."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={
                  canManage
                    ? { label: "New portfolio", onClick: handleOpenCreate }
                    : undefined
                }
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable
              data={displayed}
              columns={columns}
              getRowKey={(row) => row.id}
              minWidth="780px"
              mobileCard={renderMobileCard}
              className={PM_FILL_PANEL}
              pagination={{
                mode: "cursor",
                pageSize: PAGE_SIZE,
                hasMore: Boolean(data?.pagination.hasMore),
                hasPrevious,
                onNext: handleNextPage,
                onPrevious: goPrevious,
              }}
            />
          </PageState>
        </PmSection>
      </PmPageShell>

      <PortfolioFormSheet
        open={createOpen || !!editTarget}
        onOpenChange={handleSheetOpenChange}
        mode={editTarget ? "edit" : "create"}
        defaultValues={editTarget ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        isPending={createPortfolio.isPending || updatePortfolio.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this portfolio?"
        description="This action cannot be undone. Projects will not be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
