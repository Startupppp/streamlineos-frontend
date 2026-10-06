"use client";

import { useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PortfolioFormSheet } from "./portfolio-form-sheet";
import type { Portfolio } from "@/types/projects";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { PortfoliosToolbar } from "./portfolios-toolbar";
import {
  PORTFOLIO_TABLE_HEADERS,
  PortfolioMobileCard,
  buildPortfolioColumns,
} from "./portfolio-table-columns";
import { usePortfoliosPage, PAGE_SIZE } from "./use-portfolios-page";

export function PortfoliosPage() {
  const {
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
  } = usePortfoliosPage();

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
          <BuildListSurface<Portfolio>
            permission="build:portfolios:view"
            rows={rows}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            minWidth="780px"
            mobileCard={renderMobileCard}
            pagination={{
              mode: "cursor",
              pageSize: PAGE_SIZE,
              pageNumber,
              hasMore: Boolean(data?.pagination.hasMore),
              hasPrevious,
              onNext: handleNextPage,
              onPrevious: goPrevious,
            }}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="projects"
                title="No portfolios yet"
                description="Create a portfolio to group and govern your projects."
                action={
                  canManage
                    ? { label: "New portfolio", onClick: handleOpenCreate }
                    : undefined
                }
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="projects"
                title="No portfolios match your filters"
                description="Try adjusting the filters to see more portfolios."
                onClearFilters={listFilters.clearAll}
              />
            }
            loadingHeaders={PORTFOLIO_TABLE_HEADERS}
            loadingRows={12}
            onRetry={handleRetry}
          />
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
