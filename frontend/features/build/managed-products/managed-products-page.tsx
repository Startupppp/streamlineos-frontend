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
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import {
  MANAGED_PRODUCT_TABLE_HEADERS,
  ManagedProductMobileCard,
} from "./managed-product-table-columns";
import { ManagedProductBulkToolbar } from "./managed-product-bulk-toolbar";
import {
  useManagedProductsPage,
  STATUS_OPTIONS,
  SORT_OPTIONS,
  PAGE_SIZE,
} from "./use-managed-products-page";

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
    selected,
    setSelected,
    statusValue,
    sortValue,
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
    handleStatusChange,
    handleSortChange,
    handleOpenCreate,
    handleSheetOpenChange,
    handleDeleteDialogChange,
    handleRetry,
    handleClearKeyboardSelection,
    handleNextPage,
    handleEditRow,
    handleDeleteRow,
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
      />
    ),
    [canDelete, canUpdate, handleDeleteRow, handleEditRow, ownerOf],
  );

  return (
    <PageWrapper
      title="Managed Products"
      subtitle="Track products and link projects to them"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search products…",
            label: "Search products",
            inputRef: searchInputRef,
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
            {
              id: "sort",
              label: "Sort",
              active: listFilters.isActive("sort"),
              control: (
                <BuildFilterSelect
                  label="Sort"
                  value={sortValue}
                  onValueChange={handleSortChange}
                  options={SORT_OPTIONS}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
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
            getRowKey={(row) => row.id}
            minWidth="720px"
            mobileCard={renderMobileCard}
            selection={
              canUpdate
                ? {
                    selected,
                    onChange: setSelected,
                    getRowLabel: (row: ManagedProduct) => row.name,
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
                title="No managed products yet"
                description="Create a managed product to track delivery across projects."
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
                illustrationPreset="projects"
                title="No managed products match your filters"
                description="Try adjusting or clearing your filters."
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
    </PageWrapper>
  );
}
