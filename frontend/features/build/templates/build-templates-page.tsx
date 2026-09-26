"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { PageState } from "@/components/shared/page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { RequireModule } from "@/components/auth/require-module";
import {
  useProjectTemplates,
  useDeleteProjectTemplate,
  type ProjectTemplate,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { TemplateCard } from "@/features/build/templates/template-card";
import { CreateTemplateSheet } from "@/features/build/templates/create-template-sheet";
import { ApplyTemplateDialog } from "@/features/build/templates/apply-template-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import {
  useBuildListFilters,
  BUILD_FILTER_ALL,
} from "@/features/build/shared/use-build-list-filters";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { TemplatesGridSkeleton } from "./templates-grid-skeleton";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";

const CATEGORY_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "ENGINEERING", label: "Engineering" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "DESIGN", label: "Design" },
  { value: "SALES", label: "Sales" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "name", label: "A – Z" },
] as const;

const FILTER_DEFINITIONS = [
  { param: "category", options: CATEGORY_OPTIONS.map((o) => o.value) },
  { param: "sort", options: SORT_OPTIONS.map((o) => o.value) },
] as const;

function NewTemplateButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" /> New Template
    </Button>
  );
}

export function BuildTemplatesPage() {
  const canManage = useCan("build:manage");
  const isOnline = useOnlineStatus();
  const searchRef = useRef<HTMLInputElement>(null);

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS, withSearch: true });
  const categoryFilter = listFilters.value("category");
  const sortFilter = listFilters.value("sort");
  const searchDisplay = listFilters.search;
  const debouncedSearch = listFilters.debouncedSearch;

  const {
    data: templatePages,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useProjectTemplates({
    q: debouncedSearch || undefined,
    category: categoryFilter !== BUILD_FILTER_ALL ? categoryFilter : undefined,
    sort: sortFilter !== BUILD_FILTER_ALL ? sortFilter : undefined,
  });
  const deleteTemplate = useDeleteProjectTemplate();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<ProjectTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTemplate | null>(null);

  const templates = useMemo(
    () => templatePages?.pages.flatMap((p) => p.data) ?? [],
    [templatePages],
  );

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handleApplyTarget = useCallback((t: ProjectTemplate) => setApplyTarget(t), []);
  const handleCloseApply = useCallback(() => setApplyTarget(null), []);
  const handleDeleteTarget = useCallback((t: ProjectTemplate) => setDeleteTarget(t), []);
  const handleCategoryChange = useCallback(
    (value: string) => listFilters.setValue("category", value),
    [listFilters],
  );
  const handleSortChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const handleKeyboardOpen = useCallback((index: number) => {
    const t = templates[index];
    if (t) setApplyTarget(t);
  }, [templates]);
  const handleKeyboardClear = useCallback(() => setApplyTarget(null), []);

  useBuildListKeyboard({
    itemCount: templates.length,
    onOpen: handleKeyboardOpen,
    onCreate: canManage ? handleOpenCreate : undefined,
    onClearSelection: handleKeyboardClear,
    searchInputRef: searchRef,
    enabled: pageState.kind === "ready",
  });

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteTemplate.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteTarget(null);
      },
      onError: (e) => {
        if (isApiError(e) && e.status === 409) {
          toast.info("Template was already modified. Refreshing…");
          void refetch();
          setDeleteTarget(null);
          return;
        }
        toast.error(getErrorMessage(e));
      },
    });
  }, [deleteTarget, deleteTemplate, refetch]);

  function handleRetry() {
    void refetch();
  }

  if (pageState.kind === "loading") {
    return (
      <RequireModule module="build">
        <PageWrapper
          title="Templates"
          subtitle="Reusable project structures to bootstrap new work"
        >
          <PmPageShell>
            <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
              <TemplatesGridSkeleton />
            </PmSection>
          </PmPageShell>
        </PageWrapper>
      </RequireModule>
    );
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <RequireModule module="build">
        <PageWrapper
          title="Templates"
          subtitle="Reusable project structures to bootstrap new work"
        >
          <PageState
            resolution={pageState}
            loading={<TemplatesGridSkeleton />}
            onRetry={handleRetry}
            className="flex-1"
          >
            {null}
          </PageState>
        </PageWrapper>
      </RequireModule>
    );
  }

  return (
    <RequireModule module="build">
      <PageWrapper
        title="Templates"
        subtitle="Reusable project structures to bootstrap new work"
        actions={canManage ? <NewTemplateButton onClick={handleOpenCreate} /> : undefined}
        filters={
          <BuildListToolbar
            search={{
              value: searchDisplay,
              onValueChange: listFilters.setSearch,
              placeholder: "Search templates…",
              inputRef: searchRef,
            }}
            filters={[
              {
                id: "category",
                label: "Category",
                active: listFilters.isActive("category"),
                control: (
                  <BuildFilterSelect
                    label="Category"
                    value={categoryFilter}
                    onValueChange={handleCategoryChange}
                    options={CATEGORY_OPTIONS}
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
                    value={sortFilter}
                    onValueChange={handleSortChange}
                    options={SORT_OPTIONS}
                  />
                ),
              },
            ]}
            onClearAll={listFilters.activeCount > 0 ? listFilters.clearAll : undefined}
          />
        }
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            {templates.length > 0 ? (
              <>
                <PmStaggerList
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  role="list"
                  aria-label="Project templates"
                >
                  {templates.map((t) => (
                    <div key={t.id} role="listitem">
                      <TemplateCard
                        template={t}
                        onApply={handleApplyTarget}
                        onDelete={handleDeleteTarget}
                      />
                    </div>
                  ))}
                </PmStaggerList>
                <InfiniteScrollSentinel
                  hasNextPage={!!hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onLoadMore={handleLoadMore}
                  label="Load more templates"
                />
              </>
            ) : !isOnline ? (
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="projects"
                title="You are offline"
                description="Showing cached data. Reconnect to see the latest templates."
              />
            ) : (
              <EmptyState
                className={PM_FILL_PANEL}
                illustration={<EmptyProjectsIllustration className="h-32 w-32" />}
                title="No templates yet"
                description="Create a reusable project structure to bootstrap new projects quickly."
                action={canManage ? { label: "Create your first template", onClick: handleOpenCreate } : undefined}
              />
            )}
          </PmSection>
        </PmPageShell>

        <CreateTemplateSheet open={createOpen} onClose={handleCloseCreate} />

        {applyTarget ? (
          <ApplyTemplateDialog template={applyTarget} onClose={handleCloseApply} />
        ) : null}

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={handleDeleteDialogChange}
          title="Delete template?"
          description={`"${deleteTarget?.name ?? ""}" will be permanently deleted. Projects created from it will not be affected.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
        />
      </PageWrapper>
    </RequireModule>
  );
}
