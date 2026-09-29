"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useManagedProduct,
  useManagedProductInsights,
} from "@/hooks/api/build/managed-products";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { getUserDisplayName } from "@/lib/person-display";
import { ManagedProductFormSheet } from "@/features/build/managed-products/managed-product-form-sheet";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { Pencil } from "lucide-react";
import { useProjects } from "@/hooks/api/build/projects";
import { useRoadmapItems } from "@/hooks/api/build/roadmap";
import { useGoalsPage } from "@/hooks/api/goals";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase, Map, MessageSquare, Target } from "lucide-react";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import { LinkedProjectRow } from "./linked-project-row";
import { BuildOfflineNotice } from "@/features/build/shared/build-offline-notice";
import { useOnlineStatus } from "@/hooks/common/use-online-status";

const PROJECT_SORT_VALUES = ["name_asc", "priority_desc", "due_asc", "due_desc"] as const;

const OVERVIEW_FILTER_DEFINITIONS = [
  { param: "ownerId" },
  { param: "status" },
  { param: "cursor" },
  { param: "sort", options: PROJECT_SORT_VALUES },
] as const;

const PROJECT_SORT_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Newest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "priority_desc", label: "Priority high to low" },
  { value: "due_asc", label: "Due soonest" },
  { value: "due_desc", label: "Due latest" },
];

const EDIT_ACTION = { id: "edit", label: "Edit product", icon: Pencil, primary: true as const };

const PROJECT_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

interface ManagedProductOverviewPageProps {
  managedProductId: number;
}

export function ManagedProductOverviewSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6">
      <StatCardGridSkeleton cols={2} count={1} />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

export function ManagedProductOverviewPage({ managedProductId }: ManagedProductOverviewPageProps) {
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

  const linkedProjects = projectsPage?.data ?? [];
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
    () => (canEdit ? [{ ...EDIT_ACTION, onSelect: handleOpenEdit }] : []),
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

  return (
    <PageWrapper
      title={product?.name ?? "Product overview"}
      badge={product?.key}
      subtitle={overviewSubtitle}
      actions={<BuildHeaderActions actions={editActions} />}
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search linked projects…",
            label: "Search linked projects",
            inputRef: searchInputRef,
          }}
          filters={[
            {
              id: "owner",
              label: "Owner",
              active: listFilters.isActive("ownerId"),
              control: (
                <BuildFilterSelect
                  label="Owner"
                  value={rawOwner}
                  onValueChange={handleOwnerChange}
                  options={ownerOptions}
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
                  value={rawSort}
                  onValueChange={handleSortChange}
                  options={PROJECT_SORT_OPTIONS}
                />
              ),
            },
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={rawStatus}
                  onValueChange={handleStatusChange}
                  options={PROJECT_STATUS_OPTIONS}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
    >
      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
      {product ? (
        <ManagedProductFormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          defaultValues={product}
        />
      ) : null}
      <PageState
        resolution={resolution}
        loading={<ManagedProductOverviewSkeleton />}
        empty={<EmptyState title="Product not found" description="This product may have been deleted or moved." className="flex-1" />}
        onRetry={handleRetry}
        className="flex-1 min-h-0"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <BuildOfflineNotice dataUpdatedAt={productQuery.dataUpdatedAt} />

          <StatCardGrid cols={3}>
            <StatCard
              label="Linked projects"
              value={linkedProjectsLabel}
              icon={Briefcase}
              tone="blue"
              isLoading={insightsQuery.isLoading}
              href={`/build/managed-products/${managedProductId}/projects`}
            />
            <StatCard
              label="Goals"
              value={goalsLabel}
              icon={Target}
              tone="emerald"
              isLoading={goalsQuery.isLoading}
              href={`/build/managed-products/${managedProductId}/goals`}
            />
            <StatCard
              label="Feedback"
              value={String(feedbackTotal)}
              icon={MessageSquare}
              tone="amber"
              isLoading={insightsQuery.isLoading}
              href={`/build/managed-products/${managedProductId}/feedback`}
            />
          </StatCardGrid>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-sm font-medium">Roadmap</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {roadmapItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No roadmap items for this product yet.
                </p>
              ) : (
                roadmapItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{item.title}</span>
                    <Badge variant="outline" className="h-5 shrink-0 px-2 py-0.5 text-micro">
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
              {hasMoreRoadmap && (
                <Link
                  href={`/build/managed-products/${managedProductId}/roadmap`}
                  className="block text-dense text-primary hover:underline"
                >
                  View full roadmap
                </Link>
              )}
            </CardContent>
          </Card>

          {linkedProjects.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium">Linked projects</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkedProjects.map((proj, index) => (
                  <LinkedProjectRow
                    key={proj.id}
                    project={proj}
                    focused={focusedIndex === index}
                  />
                ))}
                {hasMoreProjects && (
                  <Link
                    href={`/build/managed-products/${managedProductId}/projects`}
                    className="block text-dense text-primary hover:underline"
                  >
                    View all linked projects
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {product?.vision && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium">Vision</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{product.vision}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </PageState>
    </PageWrapper>
  );
}
