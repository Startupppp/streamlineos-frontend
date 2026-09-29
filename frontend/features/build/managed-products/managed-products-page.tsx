"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import {
  useManagedProducts,
  useCreateManagedProduct,
  useDeleteManagedProduct,
} from "@/hooks/api/build/managed-products";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ManagedProductFormSheet } from "./managed-product-form-sheet";
import type {
  ManagedProduct,
  CreateManagedProductInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import type { NamedUser } from "@/lib/person-display";
import {
  MANAGED_PRODUCT_TABLE_HEADERS,
  ManagedProductMobileCard,
  buildManagedProductColumns,
} from "./managed-product-table-columns";
import { ManagedProductBulkToolbar } from "./managed-product-bulk-toolbar";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const SORT_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Default order" },
  { value: "name", label: "Name" },
  { value: "updated", label: "Last updated" },
  { value: "status", label: "Status" },
];

const FILTER_DEFINITIONS = [
  {
    param: "status",
    options: STATUS_OPTIONS.map((option) => option.value),
  },
  {
    param: "sort",
    options: SORT_OPTIONS.map((option) => option.value),
  },
  { param: "ownerId" },
] as const;

export function ManagedProductsPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const canCreate = useCan("build:managed-products:create");
  const canUpdate = useCan("build:managed-products:update");
  const canDelete = useCan("build:managed-products:delete");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const { cursor, hasPrevious, goNext, goPrevious } = useBuildCursorPager(
    listFilters.resetKey,
  );

  const {
    open: createOpen,
    onOpenChange: setCreateOpen,
    setOpen: openCreate,
  } = useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<ManagedProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedProduct | null>(null);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const statusValue = listFilters.value("status");
  const sortValue = listFilters.value("sort");
  const ownerIdValue = listFilters.value("ownerId");
  const { data, isLoading, isError, error, refetch } = useManagedProducts({
    cursor,
    limit: PAGE_SIZE,
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    search: listFilters.debouncedSearch.trim() || undefined,
    ownerId: ownerIdValue || undefined,
    sort:
      sortValue && sortValue !== BUILD_FILTER_ALL &&
      (sortValue === "name" || sortValue === "updated" || sortValue === "status")
        ? sortValue
        : undefined,
  });

  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createProduct = useCreateManagedProduct();
  const deleteProduct = useDeleteManagedProduct();

  const ownerOf = useCallback(
    (ownerId: string | null): NamedUser | null => {
      if (!ownerId) return null;
      const match = members.find((member) => member.userId === ownerId);
      return match ? { name: match.name, email: match.email } : null;
    },
    [members],
  );

  const displayed = useMemo(() => data?.data ?? [], [data]);

  const handleCreate = useCallback(
    (input: CreateManagedProductInput) => {
      createProduct.mutate(input, {
        onSuccess: () => {
          toast.success("Managed product created");
          setCreateOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createProduct, setCreateOpen],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Managed product deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteProduct, deleteTarget]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleSortChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );

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
      if (product) setEditTarget(product);
    },
    [displayed],
  );

  const selectedIds = useMemo(
    () => [...selected].map(Number).filter((id) => Number.isFinite(id)),
    [selected],
  );

  useBuildListKeyboard({
    itemCount: displayed.length,
    onOpen: handleOpenFocused,
    onEdit: handleEditFocused,
    onCreate: canCreate ? handleOpenCreate : undefined,
    onClearSelection: handleClearKeyboardSelection,
    searchInputRef,
    enabled: !createOpen && !editTarget && !deleteTarget,
  });

  const handleEditRow = useCallback(
    (row: ManagedProduct) => setEditTarget(row),
    [],
  );
  const handleDeleteRow = useCallback(
    (row: ManagedProduct) => setDeleteTarget(row),
    [],
  );

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  const canManageRow = canUpdate || canDelete;

  const columns = useMemo(
    () =>
      buildManagedProductColumns({
        canManage: canManageRow,
        ownerOf,
        onEdit: handleEditRow,
        onDelete: handleDeleteRow,
      }),
    [canManageRow, handleDeleteRow, handleEditRow, ownerOf],
  );

  const renderMobileCard = useCallback(
    (row: ManagedProduct) => (
      <ManagedProductMobileCard
        product={row}
        canManage={canManageRow}
        ownerOf={ownerOf}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
      />
    ),
    [canManageRow, handleDeleteRow, handleEditRow, ownerOf],
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
          {selectedIds.length > 0 && (
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

      {createOpen && (
        <ManagedProductFormSheet
          open={createOpen}
          onOpenChange={handleSheetOpenChange}
          mode="create"
          onSubmitCreate={handleCreate}
          isPending={createProduct.isPending}
        />
      )}

      {editTarget && (
        <ManagedProductFormSheet
          open={!!editTarget}
          onOpenChange={handleSheetOpenChange}
          mode="edit"
          defaultValues={editTarget}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
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
