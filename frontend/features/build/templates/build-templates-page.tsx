"use client";

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
import { TemplateCard } from "@/features/build/templates/template-card";
import { CreateTemplateSheet } from "@/features/build/templates/create-template-sheet";
import { ApplyTemplateDialog } from "@/features/build/templates/apply-template-dialog";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { TemplatesGridSkeleton } from "./templates-grid-skeleton";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { useBuildTemplatesPage } from "./use-build-templates-page";

const CATEGORY_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "ENGINEERING", label: "Engineering" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "DESIGN", label: "Design" },
  { value: "SALES", label: "Sales" },
  { value: "CONTENT", label: "Content Production" },
  { value: "FREELANCER", label: "Freelancer" },
  { value: "SOFTWARE_PRODUCT", label: "Software Product" },
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
  const {
    canManage,
    isOnline,
    searchRef,
    listFilters,
    categoryFilter,
    sortFilter,
    searchDisplay,
    hasNextPage,
    isFetchingNextPage,
    templates,
    pageState,
    createOpen,
    applyTarget,
    deleteTarget,
    handleOpenCreate,
    handleCloseCreate,
    handleApplyTarget,
    handleCloseApply,
    handleDeleteTarget,
    handleCategoryChange,
    handleSortChange,
    handleLoadMore,
    handleDeleteDialogChange,
    handleDelete,
    handleRetry,
  } = useBuildTemplatesPage();

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
                    options={[
                      { value: BUILD_FILTER_ALL, label: "All categories" },
                      ...CATEGORY_OPTIONS,
                    ]}
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
                    value={sortFilter === "newest" ? BUILD_FILTER_ALL : sortFilter}
                    onValueChange={handleSortChange}
                    options={[
                      { value: BUILD_FILTER_ALL, label: "Newest first" },
                      { value: "name", label: "A – Z" },
                    ]}
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
                className={CONTENT_FILL_PANEL}
                illustrationPreset="projects"
                title="You are offline"
                description="Showing cached data. Reconnect to see the latest templates."
              />
            ) : (
              <EmptyState
                className={CONTENT_FILL_PANEL}
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
