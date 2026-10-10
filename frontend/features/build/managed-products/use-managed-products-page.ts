import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import {
  useManagedProducts,
  useCreateManagedProduct,
  useDeleteManagedProduct,
} from "@/hooks/api/build/managed-products";
import { useCan } from "@/hooks/api/access";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import type {
  ManagedProduct,
  CreateManagedProductInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import type { NamedUser } from "@/lib/person-display";
import { buildManagedProductColumns } from "./managed-product-table-columns";

export const PAGE_SIZE = 20;

export const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const SORT_OPTIONS = [
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

export function useManagedProductsPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const canCreate = useCan("build:managed-products:create");
  const canUpdate = useCan("build:managed-products:update");
  const canDelete = useCan("build:managed-products:delete");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const { cursor, pageNumber, hasPrevious, goNext, goPrevious } =
    useBuildCursorPager(listFilters.resetKey);

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
    ownerId: ownerIdValue !== BUILD_FILTER_ALL ? ownerIdValue : undefined,
    sort:
      sortValue &&
      sortValue !== BUILD_FILTER_ALL &&
      (sortValue === "name" ||
        sortValue === "updated" ||
        sortValue === "status")
        ? sortValue
        : undefined,
  });

  const { data: membersRes } = useBuildMembers({ limit: 100 });
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createProduct = useCreateManagedProduct();
  const deleteProduct = useDeleteManagedProduct();

  const ownerOf = useCallback(
    (ownerId: string | null): NamedUser | null => {
      if (!ownerId) return null;
      const match = members.find((member) => member.id === ownerId);
      return match ? { name: match.name, email: match.email } : null;
    },
    [members],
  );

  const displayed = useMemo(() => data?.data ?? [], [data]);

  const handleCreate = useCallback(
    (input: CreateManagedProductInput) => {
      if (!canCreate) return;
      createProduct.mutate(input, {
        onSuccess: () => {
          toast.success("Managed product created");
          setCreateOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [canCreate, createProduct, setCreateOpen],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!canDelete || !deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Managed product deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [canDelete, deleteProduct, deleteTarget]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleSortChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );

  const handleOpenCreate = useCallback(() => {
    if (canCreate) openCreate();
  }, [canCreate, openCreate]);

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
      if (canUpdate && product) setEditTarget(product);
    },
    [canUpdate, displayed],
  );

  const selectedIds = useMemo(
    () => [...selected].map(Number).filter((id) => Number.isFinite(id)),
    [selected],
  );

  useBuildListKeyboard({
    itemCount: displayed.length,
    onOpen: handleOpenFocused,
    onEdit: canUpdate ? handleEditFocused : undefined,
    onCreate: canCreate ? handleOpenCreate : undefined,
    onClearSelection: handleClearKeyboardSelection,
    searchInputRef,
    enabled: !createOpen && !editTarget && !deleteTarget,
  });

  const handleEditRow = useCallback(
    (row: ManagedProduct) => {
      if (canUpdate) setEditTarget(row);
    },
    [canUpdate],
  );
  const handleDeleteRow = useCallback(
    (row: ManagedProduct) => {
      if (canDelete) setDeleteTarget(row);
    },
    [canDelete],
  );

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  const columns = useMemo(
    () =>
      buildManagedProductColumns({
        canUpdate,
        canDelete,
        ownerOf,
        onEdit: handleEditRow,
        onDelete: handleDeleteRow,
      }),
    [canDelete, canUpdate, handleDeleteRow, handleEditRow, ownerOf],
  );

  return {
    canCreate,
    canUpdate,
    canDelete,
    listFilters,
    pageNumber,
    hasPrevious,
    goPrevious,
    createOpen,
    setCreateOpen,
    editTarget,
    setEditTarget,
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
    createProductIsPending: createProduct.isPending,
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
  };
}
