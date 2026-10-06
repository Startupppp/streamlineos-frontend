import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useManagedProduct,
  useManagedProductInsights,
} from "@/hooks/api/build/managed-products";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { getUserDisplayName } from "@/lib/person-display";
import { Pencil } from "lucide-react";
import { useProjects } from "@/hooks/api/build/projects";
import { useRoadmapItems } from "@/hooks/api/build/roadmap";
import { useGoalsPage } from "@/hooks/api/goals";
import { usePageState } from "@/hooks/api/use-page-state";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useOnlineStatus } from "@/hooks/common/use-online-status";

const PROJECT_SORT_VALUES = ["name_asc", "priority_desc", "due_asc", "due_desc"] as const;

const OVERVIEW_FILTER_DEFINITIONS = [
  { param: "ownerId" },
  { param: "status" },
  { param: "cursor" },
  { param: "sort", options: PROJECT_SORT_VALUES },
] as const;

export const PROJECT_SORT_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Newest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "priority_desc", label: "Priority high to low" },
  { value: "due_asc", label: "Due soonest" },
  { value: "due_desc", label: "Due latest" },
];

export const PROJECT_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

const EDIT_ACTION_BASE = { id: "edit", label: "Edit product", icon: Pencil, primary: true as const };

export function useManagedProductOverview(managedProductId: number) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const listFilters = useBuildListFilters({ filters: OVERVIEW_FILTER_DEFINITIONS, withSearch: true });
  const searchValue = listFilters.debouncedSearch.trim() || undefined;
  const rawOwner = listFilters.value("ownerId");
  const managerId = rawOwner && rawOwner !== BUILD_FILTER_ALL ? rawOwner : undefined;
  const rawStatus = listFilters.value("status");
  const statusParam =
    rawStatus === "ACTIVE" || rawStatus === "COMPLETED" || rawStatus === "ARCHIVED" || rawStatus === "ALL"
      ? rawStatus
      : undefined;
  const rawSort = listFilters.value("sort");
  const sortParam = PROJECT_SORT_VALUES.find((value) => value === rawSort);
  const rawCursor = listFilters.value("cursor");
  const parsedCursor =
    rawCursor && rawCursor !== BUILD_FILTER_ALL ? parseInt(rawCursor, 10) : undefined;
  const afterId =
    sortParam === undefined && Number.isInteger(parsedCursor) ? parsedCursor : undefined;

  const productQuery = useManagedProduct(managedProductId);
  const projectsQuery = useProjects(
    {
      managedProductId,
      limit: 10,
      search: searchValue,
      managerId,
      status: statusParam,
      ...(sortParam ? { sort: sortParam } : {}),
      ...(afterId === undefined ? {} : { afterId }),
    },
    { enabled: !!managedProductId },
  );
  const insightsQuery = useManagedProductInsights(managedProductId);
  const { data: membersRes } = useOrgMembers(1, 100);
  const isOnline = useOnlineStatus();
  const canEdit = useCan("build:managed-products:update") && isOnline;
  const [editOpen, setEditOpen] = useState(false);
  const roadmapQuery = useRoadmapItems({ managedProductId, limit: 5 });
  const goalsQuery = useGoalsPage({ managedProductId });

  const isLoading =
    productQuery.isLoading || projectsQuery.isLoading || insightsQuery.isLoading;

  const isError =
    productQuery.isError || projectsQuery.isError || insightsQuery.isError;

  const error = productQuery.error ?? projectsQuery.error ?? insightsQuery.error;

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: !productQuery.data,
  });

  const product = productQuery.data;
  const projectsPage = projectsQuery.data;

  const hasMoreProjects = projectsPage?.hasMore ?? false;
  const linkedProjectsLabel = String(insightsQuery.data?.linkedProjectCount ?? 0);

  function handleRetry() {
    void productQuery.refetch();
    void projectsQuery.refetch();
    void insightsQuery.refetch();
    void roadmapQuery.refetch();
    void goalsQuery.refetch();
  }

  const linkedProjects = useMemo(() => projectsPage?.data ?? [], [projectsPage]);
  const roadmapItems = roadmapQuery.data?.data ?? [];
  const hasMoreRoadmap = roadmapQuery.data?.pagination?.hasMore ?? false;
  const goalsLabel = String(goalsQuery.data?.total ?? 0);

  const feedbackTotal = Object.values(
    insightsQuery.data?.feedbackByStatus ?? {},
  ).reduce((a: number, b: number) => a + b, 0);

  const handleOpenFocused = useCallback(
    (index: number) => {
      const proj = linkedProjects[index];
      if (proj) {
        router.push(`/build/${proj.id}`);
      }
    },
    [linkedProjects, router],
  );

  const handleClearSelection = useCallback(() => {}, []);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleSortChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );

  const handleOwnerChange = useCallback(
    (value: string) => listFilters.setValue("ownerId", value),
    [listFilters],
  );

  const handleOpenEdit = useCallback(() => setEditOpen(true), []);

  const ownerOptions = useMemo(() => {
    const members = membersRes?.data ?? [];
    return [
      { value: BUILD_FILTER_ALL, label: "All owners" },
      ...members.map((member) => ({
        value: member.userId,
        label: getUserDisplayName(member),
      })),
    ];
  }, [membersRes]);

  const overviewSubtitle = useMemo(() => {
    if (!product) return undefined;
    const parts: string[] = [];
    if (product.status) parts.push(product.status);
    parts.push(`Owner ${getUserDisplayName(product.owner)}`);
    if (product.updatedAt) parts.push(`updated ${product.updatedAt.slice(0, 10)}`);
    return parts.join(" · ");
  }, [product]);

  const editActions = useMemo(
    () => (canEdit ? [{ ...EDIT_ACTION_BASE, onSelect: handleOpenEdit }] : []),
    [canEdit, handleOpenEdit],
  );

  const handleShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(true);
  }, []);

  const { focusedIndex } = useBuildListKeyboard({
    itemCount: linkedProjects.length,
    onOpen: handleOpenFocused,
    onClearSelection: handleClearSelection,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef,
  });

  return {
    listFilters,
    searchInputRef,
    rawOwner,
    rawStatus,
    rawSort,
    ownerOptions,
    product,
    editOpen,
    setEditOpen,
    resolution,
    overviewSubtitle,
    editActions,
    focusedIndex,
    linkedProjects,
    hasMoreProjects,
    linkedProjectsLabel,
    roadmapItems,
    hasMoreRoadmap,
    goalsLabel,
    feedbackTotal,
    productDataUpdatedAt: productQuery.dataUpdatedAt,
    insightsIsLoading: insightsQuery.isLoading,
    goalsIsLoading: goalsQuery.isLoading,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    handleRetry,
    handleStatusChange,
    handleSortChange,
    handleOwnerChange,
  };
}
