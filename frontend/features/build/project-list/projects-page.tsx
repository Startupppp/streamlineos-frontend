"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { useProjects } from "@/hooks/api/build/projects";
import { useAccess, useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { ProjectFilterBar } from "@/features/build/project-list/project-filter-bar";
import { ProjectsEmptyState } from "@/features/build/project-list/projects-empty-state";
import { useDisplayPrefs } from "@/features/build/project-list/use-display-prefs";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { useReducedMotion } from "framer-motion";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { useResumeLastProject } from "@/features/build/project-list/use-resume-last-project";
import {
  GridSkeleton,
  ListSkeleton,
} from "@/features/build/project-list/projects-page-skeletons";
import {
  filterVisibleProjects,
  groupProjects,
  sortProjects,
} from "@/features/build/project-list/project-list-shaping";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useProjectsPage } from "./use-projects-page";
import { ProjectsViewContent } from "./projects-view-content";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";

const NewProjectDialog = dynamic(
  () =>
    import("./new-project-dialog").then((m) => ({
      default: m.NewProjectDialog,
    })),
  { ssr: false },
);

interface ProjectsPageProps {
  managedProductId?: number;
}

export function ProjectsPage({ managedProductId }: ProjectsPageProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { prefs, setPrefs, toggle } = useDisplayPrefs();
  const canCreate = useCan("build:create");
  const { data: access } = useAccess();
  const resumeAction = useResumeLastProject();

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [showGroupingSidebar, setShowGroupingSidebar] = useState(false);

  const handleToggleGroupingSidebar = useCallback(() => {
    setShowGroupingSidebar((prev) => !prev);
  }, []);

  const {
    createOpen,
    handleCreateOpenChange,
    handleOpenCreate,
    localSearch,
    debouncedSearch,
    updateParams,
    viewMode,
    activeFilters,
    filterManagerId,
    filterProductId,
    filterClientId,
    filterHealth,
    handleSearchChange,
    handleViewModeChange,
    handleFiltersChange,
  } = useProjectsPage();

  const handleClearFilters = useCallback(() => {
    setActiveGroup(null);
    updateParams({
      q: null,
      filterLead: null,
      managerId: null,
      filterStatus: null,
      filterHealth: null,
      startAfter: null,
      endBefore: null,
      productId: null,
      clientId: null,
    });
  }, [updateParams]);

  const pageSize = viewMode === "grid" ? 12 : 25;
  const cursorResetKey = [
    pageSize,
    debouncedSearch,
    activeFilters.status ?? "",
    filterManagerId ?? "",
    filterHealth ?? "",
    activeFilters.startAfter ?? "",
    activeFilters.endBefore ?? "",
    managedProductId ?? filterProductId ?? "",
  ].join(":");
  const pager = useBuildCursorPager(cursorResetKey);
  const parsedAfterId =
    pager.cursor === undefined ? undefined : Number(pager.cursor);
  const afterId =
    parsedAfterId !== undefined &&
    Number.isInteger(parsedAfterId) &&
    parsedAfterId > 0
      ? parsedAfterId
      : undefined;

  const { data, isLoading, isError, error, refetch } = useProjects(
    {
      limit: pageSize,
      ...(afterId === undefined ? {} : { afterId }),
      search: debouncedSearch || undefined,
      status: activeFilters.status,
      ...(filterManagerId ? { managerId: filterManagerId } : {}),
      ...(filterHealth ? { health: filterHealth } : {}),
      ...(activeFilters.startAfter ? { startAfter: activeFilters.startAfter } : {}),
      ...(activeFilters.endBefore ? { endBefore: activeFilters.endBefore } : {}),
      ...(managedProductId !== undefined
        ? { managedProductId }
        : filterProductId
          ? { managedProductId: Number(filterProductId) }
          : {}),
    },
    INLINE_READ_ERROR,
  );

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleNextPage = useCallback(() => {
    pager.goNext(data?.nextCursor == null ? null : String(data.nextCursor));
  }, [data?.nextCursor, pager]);

  const allProjects = useMemo(
    () => data?.data ?? [],
    [data],
  );

  const visibleProjects = useMemo(() => {
    let result = filterVisibleProjects(allProjects, activeFilters, prefs.showClosed);
    result = groupProjects(result, activeGroup);
    result = sortProjects(result, prefs.orderBy, prefs.orderDir);
    return result;
  }, [allProjects, activeFilters, prefs, activeGroup]);

  const hasFiltersOrSearch =
    Boolean(debouncedSearch) ||
    Object.values(activeFilters).some(Boolean) ||
    Boolean(filterProductId) ||
    Boolean(filterClientId);
  const filtersActive = hasFiltersOrSearch || activeGroup !== null;

  const canSeeAllProjects =
    access?.isOrgOwner === true || access?.scopes["build:manage"] === "all";
  const pageTitle =
    managedProductId !== undefined
      ? "Linked Projects"
      : !access
        ? "Projects"
        : canSeeAllProjects
          ? "All Projects"
          : "My Projects";
  const pageSubtitle =
    managedProductId !== undefined
      ? "Projects linked to this managed product"
      : !access
        ? "Browse projects you can access"
        : canSeeAllProjects
          ? "Browse and manage every project in your organization"
          : "Projects you belong to, manage, or reach through your teams";

  const handleKeyboardOpenProject = useCallback(
    (index: number) => {
      const project = visibleProjects[index];
      if (project) router.push(`/build/${project.id}`);
    },
    [visibleProjects, router],
  );

  const handleKeyboardClearProject = useCallback(() => {
    handleCreateOpenChange(false);
  }, [handleCreateOpenChange]);

  useBuildListKeyboard({
    itemCount: visibleProjects.length,
    onOpen: handleKeyboardOpenProject,
    onClearSelection: handleKeyboardClearProject,
    enabled: pageState.kind === "ready",
  });

  const headerActions = useMemo(() => {
    const actions = [];
    if (resumeAction) actions.push(resumeAction);
    if (canCreate) {
      actions.push({
        id: "create",
        label: "New Project",
        icon: Plus,
        primary: true,
        onSelect: handleOpenCreate,
      });
    }
    return actions;
  }, [resumeAction, canCreate, handleOpenCreate]);

  return (
    <RequireModule module="build">
      {canCreate && (
        <NewProjectDialog
          open={createOpen}
          onOpenChange={handleCreateOpenChange}
          trigger={null}
        />
      )}
      <PageWrapper
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={<BuildHeaderActions actions={headerActions} />}
        noInternalScroll
        filtersClassName="flex-col items-stretch gap-0 overflow-visible pb-2 [&>*]:w-full [&>*]:min-w-0 [&>*]:shrink"
        filters={
          <ProjectFilterBar
            search={localSearch}
            onSearchChange={handleSearchChange}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            filters={activeFilters}
            onFiltersChange={handleFiltersChange}
            prefs={prefs}
            onTogglePrefs={toggle}
            onSetPrefs={setPrefs}
            showGroupingSidebar={showGroupingSidebar}
            onToggleGroupingSidebar={handleToggleGroupingSidebar}
            onClearAll={handleClearFilters}
          />
        }
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            {pageState.kind !== "ready" ? (
              <PageState
                resolution={pageState}
                loading={viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />}
                onRetry={handleRetry}
                className={CONTENT_FILL_PANEL}
              >
                {null}
              </PageState>
            ) : allProjects.length === 0 && !hasFiltersOrSearch ? (
              <ProjectsEmptyState onCreate={canCreate ? handleOpenCreate : undefined} />
            ) : visibleProjects.length === 0 ? (
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="search"
                title={filtersActive ? "No projects match your filters" : "No projects found"}
                description="Try adjusting the search or filters."
                filtersActive={filtersActive}
                onClearFilters={handleClearFilters}
              />
            ) : (
              <ProjectsViewContent
                viewMode={viewMode}
                visibleProjects={visibleProjects}
                allProjects={allProjects}
                prefs={prefs}
                pageNumber={pager.pageNumber}
                hasMore={Boolean(data?.hasMore)}
                hasPrevious={pager.hasPrevious}
                onNext={handleNextPage}
                onPrevious={pager.goPrevious}
                showGroupingSidebar={showGroupingSidebar}
                onGroupingSidebarChange={setShowGroupingSidebar}
                activeGroup={activeGroup}
                onGroupSelect={setActiveGroup}
                shouldReduceMotion={shouldReduceMotion}
              />
            )}
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </RequireModule>
  );
}
