import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import {
  useManagedProducts,
  useManagedProductFacets,
  useCreateManagedProduct,
  useDeleteManagedProduct,
  useArchiveManagedProduct,
  useRestoreManagedProduct,
} from "@/hooks/api/build/managed-products";
import { useProjects } from "@/hooks/api/build/projects";
import { useCan } from "@/hooks/api/access";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useProjectTeams } from "@/hooks/api/build/teams";
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

export const LIFECYCLE_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All lifecycles" },
  { value: "discovery", label: "Discovery" },
  { value: "build", label: "Build" },
  { value: "growth", label: "Growth" },
  { value: "mature", label: "Mature" },
  { value: "sunset", label: "Sunset" },
];

export const HEALTH_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All health" },
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
  { value: "unknown", label: "Unknown" },
];

export const ARCHIVED_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Active only" },
  { value: "true", label: "Archived only" },
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
  {
    param: "lifecycle",
    options: LIFECYCLE_FILTER_OPTIONS.map((o) => o.value),
  },
  {
    param: "health",
    options: HEALTH_FILTER_OPTIONS.map((o) => o.value),
  },
  { param: "teamId" },
  { param: "segment" },
  { param: "tag" },
  { param: "linkedProjectId" },
  {
    param: "archived",
    options: [BUILD_FILTER_ALL, "true"],
  },
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
  const [archiveTarget, setArchiveTarget] = useState<ManagedProduct | null>(null);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const statusValue = listFilters.value("status");
  const sortValue = listFilters.value("sort");
  const ownerIdValue = listFilters.value("ownerId");
  const lifecycleValue = listFilters.value("lifecycle");
  const healthValue = listFilters.value("health");
  const teamIdValue = listFilters.value("teamId");
  const segmentValue = listFilters.value("segment");
  const tagValue = listFilters.value("tag");
  const linkedProjectIdValue = listFilters.value("linkedProjectId");
  const archivedValue = listFilters.value("archived");

  const { data, isLoading, isError, error, refetch } = useManagedProducts({
    cursor,
    limit: PAGE_SIZE,
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    search: listFilters.debouncedSearch.trim() || undefined,
    ownerId: ownerIdValue !== BUILD_FILTER_ALL ? ownerIdValue : undefined,
    sort:
      sortValue &&
      sortValue !== BUILD_FILTER_ALL &&
      (sortValue === "name" || sortValue === "updated" || sortValue === "status")
        ? sortValue
        : undefined,
    lifecycle: lifecycleValue !== BUILD_FILTER_ALL ? lifecycleValue : undefined,
    health: healthValue !== BUILD_FILTER_ALL ? healthValue : undefined,
    teamId: teamIdValue !== BUILD_FILTER_ALL ? teamIdValue : undefined,
    segment: segmentValue !== BUILD_FILTER_ALL ? segmentValue : undefined,
    tag: tagValue !== BUILD_FILTER_ALL ? tagValue : undefined,
    linkedProjectId: linkedProjectIdValue !== BUILD_FILTER_ALL ? linkedProjectIdValue : undefined,
    archived: archivedValue === "true" ? true : undefined,
  });

  const { data: membersRes } = useBuildMembers({ limit: 100 });
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const { data: teamsRes } = useProjectTeams({ pageSize: 100 });
  const teams = useMemo(() => teamsRes?.data ?? [], [teamsRes]);

  const teamOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All teams" },
      ...teams.map((t) => ({ value: String(t.id), label: t.name })),
    ],
    [teams],
  );

  const ownerOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All owners" },
      ...members.map((m) => ({ value: m.id, label: m.name ?? m.email })),
    ],
    [members],
  );

  const { data: facetsData } = useManagedProductFacets();
  const { data: projectsListData } = useProjects({ limit: 100 });

  const segmentOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All segments" },
      ...(facetsData?.segments ?? []).map((s) => ({ value: s, label: s })),
    ],
    [facetsData],
  );

  const tagOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All tags" },
      ...(facetsData?.tags ?? []).map((t) => ({ value: t, label: t })),
    ],
    [facetsData],
  );

  const linkedProjectOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All projects" },
      ...(projectsListData?.data ?? []).map((p) => ({
        value: String(p.id),
        label: p.name,
      })),
    ],
    [projectsListData],
  );

  const createProduct = useCreateManagedProduct();
  const deleteProduct = useDeleteManagedProduct();
  const archiveProduct = useArchiveManagedProduct();
  const restoreProduct = useRestoreManagedProduct();

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

  const handleArchiveConfirm = useCallback(() => {
    if (!canUpdate || !archiveTarget) return;
    archiveProduct.mutate(
      { managedProductId: archiveTarget.id, version: archiveTarget.version },
      {
        onSuccess: () => {
          toast.success("Managed product archived");
          setArchiveTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [canUpdate, archiveProduct, archiveTarget]);

  const handleRestoreRow = useCallback(
    (row: ManagedProduct) => {
      if (!canUpdate) return;
      restoreProduct.mutate(
        { managedProductId: row.id, version: row.version },
        {
          onSuccess: () => toast.success("Managed product restored"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [canUpdate, restoreProduct],
  );

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleSortChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );

  const handleLifecycleChange = useCallback(
    (value: string) => listFilters.setValue("lifecycle", value),
    [listFilters],
  );

  const handleHealthChange = useCallback(
    (value: string) => listFilters.setValue("health", value),
    [listFilters],
  );

  const handleTeamChange = useCallback(
    (value: string) => listFilters.setValue("teamId", value),
    [listFilters],
  );

  const handleOwnerChange = useCallback(
    (value: string) => listFilters.setValue("ownerId", value),
    [listFilters],
  );

  const handleSegmentChange = useCallback(
    (value: string) => listFilters.setValue("segment", value),
    [listFilters],
  );

  const handleTagChange = useCallback(
    (value: string) => listFilters.setValue("tag", value),
    [listFilters],
  );

  const handleLinkedProjectChange = useCallback(
    (value: string) => listFilters.setValue("linkedProjectId", value),
    [listFilters],
  );

  const handleArchivedChange = useCallback(
    (value: string) => listFilters.setValue("archived", value),
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

  const handleArchiveDialogChange = useCallback((open: boolean) => {
    if (!open) setArchiveTarget(null);
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
  const handleArchiveRow = useCallback(
    (row: ManagedProduct) => {
      if (canUpdate) setArchiveTarget(row);
    },
    [canUpdate],
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
        onArchive: handleArchiveRow,
        onRestore: handleRestoreRow,
      }),
    [canDelete, canUpdate, handleDeleteRow, handleEditRow, handleArchiveRow, handleRestoreRow, ownerOf],
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
    archiveTarget,
    selected,
    setSelected,
    statusValue,
    sortValue,
    lifecycleValue,
    healthValue,
    teamIdValue,
    ownerIdValue,
    segmentValue,
    tagValue,
    linkedProjectIdValue,
    archivedValue,
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
    createProductIsPending: createProduct.isPending,
    ownerOf,
    selectedIds,
    searchInputRef,
    handleCreate,
    handleDeleteConfirm,
    handleArchiveConfirm,
    handleStatusChange,
    handleSortChange,
    handleLifecycleChange,
    handleHealthChange,
    handleTeamChange,
    handleOwnerChange,
    handleSegmentChange,
    handleTagChange,
    handleLinkedProjectChange,
    handleArchivedChange,
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
  };
}
