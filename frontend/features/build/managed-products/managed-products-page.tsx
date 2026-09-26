"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import {
  useManagedProducts,
  useCreateManagedProduct,
  useUpdateManagedProduct,
  useDeleteManagedProduct,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { useCursorPager } from "@/components/ui/table-pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ManagedProductFormSheet } from "./managed-product-form-sheet";
import type {
  ManagedProduct,
  CreateManagedProductInput,
  UpdateManagedProductInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import type { NamedUser } from "@/lib/person-display";
import {
  MANAGED_PRODUCT_TABLE_HEADERS,
  ManagedProductMobileCard,
  buildManagedProductColumns,
} from "./managed-product-table-columns";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const SORT_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Default" },
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
  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(
    listFilters.resetKey,
  );

  const {
    open: createOpen,
    onOpenChange: setCreateOpen,
    setOpen: openCreate,
  } = useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<ManagedProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedProduct | null>(null);

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
      sortValue && sortValue !== BUILD_FILTER_ALL
        ? (sortValue as "name" | "updated" | "status")
        : undefined,
  });

  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createProduct = useCreateManagedProduct();
  const updateProduct = useUpdateManagedProduct();
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

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: displayed.length === 0,
  });

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

  const handleEdit = useCallback(
    (input: UpdateManagedProductInput & { managedProductId: number }) => {
      updateProduct.mutate(input, {
        onSuccess: () => {
          toast.success("Managed product updated");
          setEditTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateProduct],
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
    /* keyboard Esc: nothing to deselect on this page, but the hook requires the callback */
  }, []);

  useBuildListKeyboard({
    itemCount: displayed.length,
    onOpen: handleOpenFocused,
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
          <PageState
            resolution={resolution}
            loading={
              <DataTableSkeleton
                mobileCards
                rows={12}
                headers={MANAGED_PRODUCT_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="projects"
                title="No managed products yet"
                description="Create a managed product to track delivery across projects."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={
                  canCreate
                    ? { label: "New product", onClick: handleOpenCreate }
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
              minWidth="720px"
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
          onSubmitEdit={handleEdit}
          isPending={updateProduct.isPending}
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
