"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ManagedProductFormSheet } from "./managed-product-form-sheet";
import type { ManagedProduct } from "@/types/projects";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { BuildOfflineNotice } from "@/features/build/shared/build-offline-notice";
import { MANAGED_PRODUCT_TABLE_HEADERS } from "./managed-product-table-columns";
import { ManagedProductMobileCard } from "./managed-product-mobile-card";
import { ManagedProductBulkToolbar } from "./managed-product-bulk-toolbar";
import { ManagedProductsToolbar } from "./managed-products-toolbar";
import { useManagedProductsPage } from "./use-managed-products-page";
import { PAGE_SIZE } from "./managed-products-filter-constants";

export function ManagedProductsPage() {
  const {
    canCreate,
    canUpdate,
    canDelete,
    listFilters,
    pageNumber,
    hasPrevious,
    goPrevious,
    createOpen,
    editTarget,
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
    dataUpdatedAt,
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
  } = useManagedProductsPage();

  const renderMobileCard = useCallback(
    (row: ManagedProduct) => (
      <ManagedProductMobileCard
        product={row}
        canUpdate={canUpdate}
        canDelete={canDelete}
        ownerOf={ownerOf}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
        onArchive={handleArchiveRow}
      />
    ),
    [canDelete, canUpdate, handleDeleteRow, handleEditRow, handleArchiveRow, ownerOf],
  );

  const getProductRowKey = useCallback((row: ManagedProduct) => row.id, []);
  const getProductRowLabel = useCallback((row: ManagedProduct) => row.name, []);

  return (
    <PageWrapper
      title="Managed Products"
      subtitle="Projects, releases, and feedback — grouped by product"
      filters={
        <ManagedProductsToolbar
          listFilters={listFilters}
          teamOptions={teamOptions}
          ownerOptions={ownerOptions}
          segmentOptions={segmentOptions}
          tagOptions={tagOptions}
          linkedProjectOptions={linkedProjectOptions}
          searchInputRef={searchInputRef}
        />
      }
      actions={
        <BuildHeaderActions
          actions={
            canCreate
              ? [
                  {
                    id: "create",
                    label: "New product",
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
          <BuildOfflineNotice dataUpdatedAt={dataUpdatedAt} />
          {canUpdate && selectedIds.length > 0 && (
            <ManagedProductBulkToolbar
              selectedIds={selectedIds}
              onClearSelection={handleClearKeyboardSelection}
            />
          )}
          <BuildListSurface<ManagedProduct>
            permission="build:managed-products:view"
            rows={displayed}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={getProductRowKey}
            minWidth="900px"
            mobileCard={renderMobileCard}
            selection={
              canUpdate
                ? {
                    selected,
                    onChange: setSelected,
                    getRowLabel: getProductRowLabel,
                  }
                : undefined
            }
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
                title="Start with a product"
                description="A product is the home for projects, releases, and feedback. Create one to see delivery in one place."
                action={
                  canCreate
                    ? { label: "New product", onClick: handleOpenCreate }
                    : undefined
                }
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="search"
                filtersActive
                filteredTitle="No products match"
                description="Nothing on this page matches the current filters. Clear them to see every product."
                onClearFilters={listFilters.clearAll}
              />
            }
            loadingHeaders={MANAGED_PRODUCT_TABLE_HEADERS}
            loadingRows={12}
            onRetry={handleRetry}
          />
        </PmSection>
      </PmPageShell>

      {canCreate && createOpen && (
        <ManagedProductFormSheet
          open={createOpen}
          onOpenChange={handleSheetOpenChange}
          mode="create"
          onSubmitCreate={handleCreate}
          isPending={createProductIsPending}
        />
      )}

      {canUpdate && editTarget && (
        <ManagedProductFormSheet
          open={!!editTarget}
          onOpenChange={handleSheetOpenChange}
          mode="edit"
          defaultValues={editTarget}
        />
      )}

      <ConfirmDialog
        open={canDelete && !!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this managed product?"
        description="This action cannot be undone. Projects linked to this product will not be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={canUpdate && !!archiveTarget}
        onOpenChange={handleArchiveDialogChange}
        title="Archive this managed product?"
        description="The product will be hidden from active views. You can restore it later from the settings page."
        confirmLabel="Archive"
        destructive
        onConfirm={handleArchiveConfirm}
      />
    </PageWrapper>
  );
}
