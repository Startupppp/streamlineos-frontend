"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useManagedProducts,
  useCreateManagedProduct,
  useUpdateManagedProduct,
  useDeleteManagedProduct,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { usePageState } from "@/hooks/api/use-page-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManagedProductStatusBadge } from "./managed-product-status-badge";
import { ManagedProductFormSheet } from "./managed-product-form-sheet";
import type {
  ManagedProduct,
  CreateManagedProductInput,
  UpdateManagedProductInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import {
  FILTER_SELECT_TRIGGER,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const STATUS_OPTS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

function NewProductButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> New Product
    </Button>
  );
}

function ProductRowActions({
  product,
  onEdit,
  onDelete,
}: {
  product: ManagedProduct;
  onEdit: (p: ManagedProduct) => void;
  onDelete: (p: ManagedProduct) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(product), [product, onEdit]);
  const handleDelete = useCallback(() => onDelete(product), [product, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Product actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ManagedProductsPage() {
  const canCreate = useCan("build:managed-products:create");
  const canUpdate = useCan("build:managed-products:update");
  const canDelete = useCan("build:managed-products:delete");

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<ManagedProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedProduct | null>(null);

  const { data, isLoading, isError, error, refetch } = useManagedProducts({
    cursor,
    limit: PAGE_SIZE,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch.trim() || undefined,
  });

  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createProduct = useCreateManagedProduct();
  const updateProduct = useUpdateManagedProduct();
  const deleteProduct = useDeleteManagedProduct();

  function memberName(userId: string | null): string {
    if (!userId) return "—";
    const m = members.find((x) => x.userId === userId);
    return m?.name ?? m?.email ?? "Unknown";
  }

  const displayed = data?.data ?? [];

  function handleCreate(input: CreateManagedProductInput) {
    createProduct.mutate(input, {
      onSuccess: () => {
        toast.success("Managed product created");
        setCreateOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleEdit(input: UpdateManagedProductInput & { managedProductId: number }) {
    updateProduct.mutate(input, {
      onSuccess: () => {
        toast.success("Managed product updated");
        setEditTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Managed product deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function resetCursor() {
    setCursor(undefined);
    setCursorStack([]);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    resetCursor();
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    resetCursor();
  }

  function handleClearFilters() {
    setStatusFilter("all");
    setSearch("");
    resetCursor();
  }

  function handleNextPage() {
    const nextCursor = data?.pagination.nextCursor;
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, cursor ?? ""]);
    setCursor(nextCursor);
  }

  function handlePrevPage() {
    const prevCursor = cursorStack[cursorStack.length - 1];
    setCursorStack((prev) => prev.slice(0, -1));
    setCursor(prevCursor === "" ? undefined : prevCursor);
  }

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

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleRetry() {
    void refetch();
  }

  function handleEditRow(row: ManagedProduct) {
    setEditTarget(row);
  }

  function handleDeleteRow(row: ManagedProduct) {
    setDeleteTarget(row);
  }

  const canManageRow = canUpdate || canDelete;

  const columns: DataTableColumn<ManagedProduct>[] = [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <Link
          href={`/build/managed-products/${row.id}`}
          className={cn("font-medium text-foreground hover:text-primary hover:underline", TEXT_ONE_LINE)}
          title={row.name}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "key",
      header: "Key",
      className: "w-28",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.key}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ManagedProductStatusBadge status={row.status} />,
    },
    {
      key: "ownerId",
      header: "Owner",
      cell: (row) => (
        <span className={cn("max-w-[140px] text-sm text-muted-foreground", TEXT_ONE_LINE)}>
          {memberName(row.ownerId)}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <span
          className={cn("max-w-[240px] text-sm text-muted-foreground", TEXT_ONE_LINE)}
          title={row.description ?? undefined}
        >
          {row.description ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) =>
        canManageRow ? (
          <ProductRowActions product={row} onEdit={handleEditRow} onDelete={handleDeleteRow} />
        ) : null,
    },
  ];

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: displayed.length === 0,
  });

  const isFiltered = statusFilter !== "all" || !!search.trim();
  const hasPrev = cursorStack.length > 0;
  const hasNext = !!data?.pagination.hasMore;

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search products…"
        value={search}
        onValueChange={handleSearchChange}
      />
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-40")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          {STATUS_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isFiltered ? (
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={handleClearFilters}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );

  return (
    <PageWrapper
      title="Managed Products"
      subtitle="Track products and link projects to them"
      filters={filtersBar}
      actions={canCreate ? <NewProductButton onClick={handleOpenCreate} /> : undefined}
    >
      <PmPageShell>
        <PmSection index={0} className={PM_FILL_SECTION}>
          <PageState
            resolution={resolution}
            loading={<DataTableSkeleton rows={12} columns={6} className="flex-1" />}
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="projects"
                title="No managed products yet"
                description={isFiltered ? undefined : "Create a managed product to track delivery across projects."}
                filtersActive={isFiltered}
                onClearFilters={handleClearFilters}
                action={canCreate && !isFiltered ? { label: "New Product", onClick: handleOpenCreate } : undefined}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <>
              <DataTable
                data={displayed}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="720px"
                className={PM_FILL_PANEL}
              />
              {(hasPrev || hasNext) ? (
                <div className="flex items-center justify-end gap-2 border-t px-2 py-2">
                  <Button variant="outline" size="sm" disabled={!hasPrev} onClick={handlePrevPage}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={!hasNext} onClick={handleNextPage}>
                    Next
                  </Button>
                </div>
              ) : null}
            </>
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
