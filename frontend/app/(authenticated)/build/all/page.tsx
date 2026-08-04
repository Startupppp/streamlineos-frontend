"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { useProjects } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { RequireModule } from "@/components/auth/require-module";
import { NewProjectDialog } from "@/features/build/project-list/new-project-dialog";
import { ResumeLastProjectAction } from "@/features/build/project-list/resume-last-project-action";
import { ProjectCard } from "@/features/build/project-list/project-card";
import { ProjectTable } from "@/features/build/project-list/project-table";
import { ProjectFilterBar } from "@/features/build/project-list/project-filter-bar";
import { TablePagination } from "@/components/ui/table-pagination";
import { ProjectsEmptyState } from "@/features/build/project-list/projects-empty-state";
import { GroupingSidebar } from "@/features/build/project-list/grouping-sidebar";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { useDisplayPrefs } from "@/features/build/project-list/use-display-prefs";
import type { ProjectActiveFilters } from "@/features/build/project-list/add-filter-popover";
import { EmptySearchIllustration } from "@/components/illustrations";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  PmPageShell,
  PmPanel,
  PmStaggerList,
  PmSection,
  PM_FILL_PANEL,
  PM_PANEL,
} from "@/features/build/shared/pm-chrome";
import { fadeUp, fadeUpReduced } from "@/features/build/shared/pm-motion";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/types/projects/projects";
import type {
  ProjectOrderBy,
  ProjectSortDir,
} from "@/features/build/project-list/use-display-prefs";

type ViewMode = "grid" | "list";
const VIEW_MODES: readonly ViewMode[] = ["grid", "list"];

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            PM_PANEL,
            "border-l-[3px] border-l-muted p-2 space-y-2",
          )}
        >
          <div className="flex gap-2">
            <Skeleton className="h-7 w-7 rounded-md shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-10 rounded" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
          <div className="flex justify-between border-t border-border/60 pt-1.5">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <PmPanel className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-4 border-b border-border/60 bg-muted/20 px-3 py-1.5">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="ml-auto hidden h-3 w-12 sm:block" />
        <Skeleton className="hidden h-3 w-10 md:block" />
        <Skeleton className="hidden h-3 w-12 lg:block" />
        <Skeleton className="hidden h-3 w-14 sm:block" />
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 border-b border-border/40 px-3 py-1.5 last:border-0"
        >
          <Skeleton className="h-5 w-5 shrink-0 rounded" />
          <Skeleton className="h-3.5 max-w-[220px] flex-1" />
          <Skeleton className="ml-auto h-5 w-14 shrink-0 rounded-full" />
          <div className="hidden shrink-0 items-center gap-1.5 md:flex">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
          <Skeleton className="hidden h-3 w-12 shrink-0 lg:block" />
          <div className="hidden w-[100px] shrink-0 items-center gap-2 sm:flex">
            <Skeleton className="h-1 flex-1 rounded-full" />
            <Skeleton className="h-3 w-6" />
          </div>
        </div>
      ))}
    </PmPanel>
  );
}

function sortProjects(
  projects: ProjectListItem[],
  orderBy: ProjectOrderBy,
  orderDir: ProjectSortDir,
): ProjectListItem[] {
  return [...projects].sort((a, b) => {
    let cmp = 0;
    if (orderBy === "name") {
      cmp = a.name.localeCompare(b.name);
    } else if (orderBy === "status") {
      cmp = (a.status ?? "").localeCompare(b.status ?? "");
    } else if (orderBy === "targetDate") {
      const aT = a.endDate ? new Date(a.endDate).getTime() : Infinity;
      const bT = b.endDate ? new Date(b.endDate).getTime() : Infinity;
      cmp = aT - bT;
    } else if (orderBy === "progress") {
      cmp = a.progress.percentage - b.progress.percentage;
    }
    return orderDir === "asc" ? cmp : -cmp;
  });
}

function groupProjects(
  projects: ProjectListItem[],
  activeGroup: string | null,
): ProjectListItem[] {
  if (!activeGroup) return projects;
  const [type, value] = activeGroup.split(":");
  if (type === "status") {
    return projects.filter((p) => (p.status ?? "ACTIVE") === value);
  }
  if (type === "lead") {
    return projects.filter((p) => p.manager?.id === value);
  }
  if (type === "member") {
    return projects.filter((p) => p.members.some((m) => m.id === value));
  }
  if (type === "health") {
    return projects;
  }
  return projects;
}

function NewProjectTrigger({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <AnimatedIconButton
      icon={PlusIcon}
      size="sm"
      className={cn("h-9 gap-1.5", className)}
      onClick={onClick}
    >
      New Project
    </AnimatedIconButton>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();
  const { prefs, setPrefs, toggle } = useDisplayPrefs();
  const canCreate = useCan("build:create");

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

  const search = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;
  const viewMode =
    VIEW_MODES.find((v) => v === searchParams.get("view")) ?? "list";

  const filterStatus = searchParams.get("filterStatus") ?? undefined;
  const filterHealth = searchParams.get("filterHealth") ?? undefined;
  const filterLead = searchParams.get("filterLead") ?? undefined;

  const activeFilters: ProjectActiveFilters = useMemo(
    () => ({
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterHealth ? { health: filterHealth } : {}),
      ...(filterLead ? { lead: filterLead } : {}),
    }),
    [filterStatus, filterHealth, filterLead],
  );

  const debouncedSearch = useDebouncedValue(search, 300);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const handleSearchChange = useCallback(
    (value: string) => updateParams({ q: value || null, page: null }),
    [updateParams],
  );

  const handleViewModeChange = useCallback(
    (value: ViewMode) =>
      updateParams({ view: value === "list" ? null : value }),
    [updateParams],
  );

  const setPage = useCallback(
    (p: number) => updateParams({ page: p === 1 ? null : String(p) }),
    [updateParams],
  );

  const handleFiltersChange = useCallback(
    (next: ProjectActiveFilters) => {
      updateParams({
        filterStatus: next.status ?? null,
        filterHealth: next.health ?? null,
        filterLead: next.lead ?? null,
        page: null,
      });
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(
    () =>
      updateParams({
        q: null,
        page: null,
        filterLead: null,
        filterStatus: null,
        filterHealth: null,
      }),
    [updateParams],
  );

  const apiStatus =
    activeFilters.status ?? (prefs.showClosed ? undefined : undefined);

  const { data, isLoading, isError, refetch } = useProjects({
    page,
    limit: viewMode === "grid" ? 12 : 25,
    search: debouncedSearch || undefined,
    status: apiStatus as
      | "ALL"
      | "ACTIVE"
      | "COMPLETED"
      | "ARCHIVED"
      | undefined,
  });

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const rawProjects = data?.data;

  const allProjects = useMemo(() => rawProjects ?? [], [rawProjects]);

  const leadName = useMemo(() => {
    if (!activeFilters.lead) return undefined;
    const match = allProjects.find((p) => p.manager?.id === activeFilters.lead);
    return match?.manager ? getUserDisplayName(match.manager) : undefined;
  }, [activeFilters.lead, allProjects]);

  const visibleProjects = useMemo(() => {
    let result = allProjects;
    if (activeFilters.status) {
      result = result.filter((p) => p.status === activeFilters.status);
    }
    if (!prefs.showClosed) {
      result = result.filter(
        (p) => p.status !== "ARCHIVED" && p.status !== "COMPLETED",
      );
    }
    result = groupProjects(result, activeGroup);
    result = sortProjects(result, prefs.orderBy, prefs.orderDir);
    return result;
  }, [allProjects, activeFilters.status, prefs, activeGroup]);

  const pagination = data
    ? { page: data.page, total: data.total, totalPages: data.totalPages }
    : undefined;

  const hasFiltersOrSearch =
    Boolean(debouncedSearch) || Object.values(activeFilters).some(Boolean);

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
        actions={
          <>
            <ResumeLastProjectAction />
            {canCreate ? (
              <NewProjectTrigger
                className="hidden sm:inline-flex"
                onClick={handleOpenCreate}
              />
            ) : null}
          </>
        }
      >
        <PmPageShell>
          <PmSection index={0}>
            <ProjectFilterBar
              prefs={prefs}
              search={search}
              viewMode={viewMode}
              onSetPrefs={setPrefs}
              onTogglePrefs={toggle}
              filters={activeFilters}
              leadName={leadName}
              onSearchChange={handleSearchChange}
              onFiltersChange={handleFiltersChange}
              onViewModeChange={handleViewModeChange}
              showGroupingSidebar={showGroupingSidebar}
              onToggleGroupingSidebar={handleToggleGroupingSidebar}
              leading={
                canCreate ? (
                  <NewProjectTrigger onClick={handleOpenCreate} />
                ) : undefined
              }
            />
          </PmSection>

          {isLoading ? (
            viewMode === "grid" ? (
              <GridSkeleton />
            ) : (
              <ListSkeleton />
            )
          ) : isError ? (
            <PmPanel className="flex flex-1 items-center justify-center">
              <ErrorState
                onRetry={handleRetry}
                className="border-0 bg-transparent"
              />
            </PmPanel>
          ) : allProjects.length === 0 && !hasFiltersOrSearch ? (
            <ProjectsEmptyState onCreate={handleOpenCreate} />
          ) : visibleProjects.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustration={<EmptySearchIllustration className="h-28 w-28" />}
              title="No projects match your filters"
              description="Try adjusting the search or filters."
              action={{
                label: "Clear all filters",
                onClick: handleClearFilters,
              }}
            />
          ) : viewMode === "grid" ? (
            <div role="list" aria-label="Projects grid">
              <PmStaggerList className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    variants={shouldReduceMotion ? fadeUpReduced : fadeUp}
                    className="h-full"
                    role="presentation"
                  >
                    <ProjectCard project={project} />
                  </motion.div>
                ))}
              </PmStaggerList>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <ProjectTable projects={visibleProjects} prefs={prefs} />
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

          {pagination && pagination.totalPages > 1 ? (
            <TablePagination
              page={pagination.page}
              pageSize={viewMode === "grid" ? 12 : 25}
              total={pagination.total}
              onPageChange={setPage}
            />
          ) : null}
        </PmPageShell>
      </PageWrapper>
    </RequireModule>
  );
}
