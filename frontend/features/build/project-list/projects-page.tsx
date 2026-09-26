"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { useInfiniteProjects } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { ProjectCard } from "@/features/build/project-list/project-card";
import { ProjectTable } from "@/features/build/project-list/project-table";
import { ProjectFilterBar } from "@/features/build/project-list/project-filter-bar";
import { ProjectsEmptyState } from "@/features/build/project-list/projects-empty-state";
import { useDisplayPrefs } from "@/features/build/project-list/use-display-prefs";
import {
  HEALTH_OPTIONS,
  STATUS_OPTIONS,
  type ProjectActiveFilters,
} from "@/features/build/project-list/add-filter-popover";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  PmPageShell,
  PmStaggerList,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { fadeUp, fadeUpReduced } from "@/lib/motion-presets";
import { motion, useReducedMotion } from "framer-motion";
import { TablePagination } from "@/components/ui/table-pagination";
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
import { buildListSearchParams } from "@/features/build/shared/use-build-list-url-state";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";

export { filterVisibleProjects };

const NewProjectDialog = dynamic(
  () =>
    import("./new-project-dialog").then((m) => ({
      default: m.NewProjectDialog,
    })),
  { ssr: false },
);
const GroupingSidebar = dynamic(
  () =>
    import("./grouping-sidebar").then((m) => ({ default: m.GroupingSidebar })),
  { ssr: false, loading: () => null },
);

type ViewMode = "grid" | "list";
const VIEW_MODES: readonly ViewMode[] = ["grid", "list"];

interface ProjectsPageProps {
  managedProductId?: number;
}

export function ProjectsPage({ managedProductId }: ProjectsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();
  const { prefs, setPrefs, toggle } = useDisplayPrefs();
  const canCreate = useCan("build:create");
  const resumeAction = useResumeLastProject();

  const createFromUrl = searchParams.get("create") === "1";
  const [manualCreateOpen, setManualCreateOpen] = useState(false);
  const createOpen = createFromUrl || manualCreateOpen;

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [showGroupingSidebar, setShowGroupingSidebar] = useState(false);

  const handleToggleGroupingSidebar = useCallback(() => {
    setShowGroupingSidebar((prev) => !prev);
  }, []);

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      setManualCreateOpen(open);
      if (!open && searchParams.get("create")) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("create");
        const query = params.toString();
        startTransition(() => {
          router.replace(query ? `${pathname}?${query}` : pathname, {
            scroll: false,
          });
        });
      }
    },
    [searchParams, router, pathname],
  );

  const handleOpenCreate = useCallback(() => {
    setManualCreateOpen(true);
  }, []);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = buildListSearchParams(searchParams, updates, {
        resetCursor: true,
      });
      startTransition(() => {
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [searchParams, router, pathname],
  );

  const search = searchParams.get("q") || "";
  const viewMode =
    VIEW_MODES.find((v) => v === searchParams.get("view")) ?? "list";
  const filterStatus = STATUS_OPTIONS.find(
    (s) => s === searchParams.get("filterStatus"),
  );
  const filterHealth = HEALTH_OPTIONS.find(
    (h) => h === searchParams.get("filterHealth"),
  );
  const filterLead = searchParams.get("filterLead") ?? undefined;
  const filterManagerId = searchParams.get("managerId") ?? filterLead;
  const filterProductId = searchParams.get("productId");
  const filterClientId = searchParams.get("clientId") ?? undefined;

  const activeFilters: ProjectActiveFilters = useMemo(
    () => ({
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterHealth ? { health: filterHealth } : {}),
      ...(filterManagerId ? { lead: filterManagerId } : {}),
    }),
    [filterStatus, filterHealth, filterManagerId],
  );

  const debouncedSearch = useDebouncedValue(search, 300);

  const handleSearchChange = useCallback(
    (value: string) => updateParams({ q: value || null }),
    [updateParams],
  );

  const handleViewModeChange = useCallback(
    (value: ViewMode) =>
      updateParams({ view: value === "list" ? null : value }),
    [updateParams],
  );

  const handleFiltersChange = useCallback(
    (next: ProjectActiveFilters) => {
      updateParams({
        filterStatus: next.status ?? null,
        filterHealth: next.health ?? null,
        filterLead: next.lead ?? null,
      });
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    setActiveGroup(null);
    updateParams({
      q: null,
      filterLead: null,
      managerId: null,
      filterStatus: null,
      filterHealth: null,
      productId: null,
      clientId: null,
    });
  }, [updateParams]);

  const handleNoOp = useCallback(() => {}, []);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteProjects({
    limit: viewMode === "grid" ? 12 : 25,
    search: debouncedSearch || undefined,
    status: activeFilters.status,
    ...(managedProductId !== undefined
      ? { managedProductId }
      : filterProductId
        ? { managedProductId: Number(filterProductId) }
        : {}),
  });

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const allProjects = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.data),
    [data],
  );

  const visibleProjects = useMemo(() => {
    let result = filterVisibleProjects(
      allProjects,
      activeFilters,
      prefs.showClosed,
    );
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

  const handleKeyboardOpenProject = useCallback(
    (index: number) => {
      const project = visibleProjects[index];
      if (project) router.push(`/build/${project.id}`);
    },
    [visibleProjects, router],
  );

  const handleKeyboardClearProject = useCallback(() => {
    setManualCreateOpen(false);
  }, []);

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
      {(canCreate || createOpen) && (
        <NewProjectDialog
          open={createOpen}
          onOpenChange={handleCreateOpenChange}
          trigger={null}
        />
      )}
      <PageWrapper
        title="All Projects"
        subtitle="Browse and manage every project in your organization"
        actions={<BuildHeaderActions actions={headerActions} />}
        filters={
          <ProjectFilterBar
            search={search}
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
                loading={
                  viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />
                }
                onRetry={handleRetry}
                className={PM_FILL_PANEL}
              >
                {null}
              </PageState>
            ) : allProjects.length === 0 && !hasFiltersOrSearch ? (
              <ProjectsEmptyState onCreate={handleOpenCreate} />
            ) : visibleProjects.length === 0 ? (
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="search"
                title={
                  filtersActive
                    ? "No projects match your filters"
                    : "No projects found"
                }
                description="Try adjusting the search or filters."
                filtersActive={filtersActive}
                onClearFilters={handleClearFilters}
              />
            ) : viewMode === "grid" ? (
              <>
                <PmStaggerList
                  className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
                  role="list"
                  aria-label="Projects grid"
                >
                  {visibleProjects.map((project) => (
                    <motion.div
                      key={project.id}
                      variants={shouldReduceMotion ? fadeUpReduced : fadeUp}
                      className="h-full"
                      role="listitem"
                    >
                      <ProjectCard project={project} />
                    </motion.div>
                  ))}
                </PmStaggerList>
                {hasNextPage ? (
                  <TablePagination
                    mode="cursor"
                    rowCount={visibleProjects.length}
                    hasMore={true}
                    hasPrevious={false}
                    onNext={handleLoadMore}
                    onPrevious={handleNoOp}
                    disabled={isFetchingNextPage}
                  />
                ) : null}
              </>
            ) : (
              <div className="flex min-h-0 flex-1 gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <ProjectTable
                    projects={visibleProjects}
                    prefs={prefs}
                    hasMore={Boolean(hasNextPage)}
                    onLoadMore={handleLoadMore}
                  />
                </div>
                <GroupingSidebar
                  open={showGroupingSidebar}
                  onOpenChange={setShowGroupingSidebar}
                  projects={allProjects}
                  activeGroup={activeGroup}
                  onGroupSelect={setActiveGroup}
                />
              </div>
            )}
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </RequireModule>
  );
}
