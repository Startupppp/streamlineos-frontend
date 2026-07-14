"use client";

import { useCallback, useState, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useProjects } from "@/hooks/api/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { NewProjectDialog } from "@/features/projects/project-list/new-project-dialog";
import { ProjectCard } from "@/features/projects/project-list/project-card";
import { ProjectTable } from "@/features/projects/project-list/project-table";
import { ProjectFilterBar } from "@/features/projects/project-list/project-filter-bar";
import { ProjectPagination } from "@/features/projects/project-list/project-pagination";
import { ProjectsEmptyState } from "@/features/projects/project-list/projects-empty-state";
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
  PM_TOOLBAR,
  PM_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { fadeUp, fadeUpReduced } from "@/features/projects/shared/pm-motion";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
type ViewMode = "grid" | "list";

const STATUS_FILTERS: readonly StatusFilter[] = ["ALL", "ACTIVE", "COMPLETED", "ARCHIVED"];
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

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();
  const createFromUrl = searchParams.get("create") === "1";
  const [manualCreateOpen, setManualCreateOpen] = useState(false);
  const createOpen = createFromUrl || manualCreateOpen;

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
  const status = STATUS_FILTERS.find((s) => s === searchParams.get("status")) ?? "ALL";
  const page = Number(searchParams.get("page")) || 1;
  const viewMode = VIEW_MODES.find((v) => v === searchParams.get("view")) ?? "list";

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
  const handleStatusChange = useCallback(
    (value: StatusFilter) =>
      updateParams({ status: value === "ALL" ? null : value, page: null }),
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

  const handleClearFilters = useCallback(
    () => updateParams({ q: null, status: null, page: null }),
    [updateParams],
  );

  const { data, isLoading, isError, refetch } = useProjects({
    page,
    limit: viewMode === "grid" ? 12 : 25,
    search: debouncedSearch || undefined,
    status,
  });

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const projects = data?.data ?? [];
  const pagination = data
    ? { page: data.page, total: data.total, totalPages: data.totalPages }
    : undefined;

  return (
    <RequireModule module="PROJECTS">
      <PageWrapper
        title="All Projects"
        eyebrow="Projects"
        subtitle="Browse and manage every project in your workspace"
        actions={
          <NewProjectDialog open={createOpen} onOpenChange={handleCreateOpenChange} />
        }
      >
        <PmPageShell>
          <PmSection index={0}>
            <div className={PM_TOOLBAR}>
              <ProjectFilterBar
                search={search}
                onSearchChange={handleSearchChange}
                status={status}
                onStatusChange={handleStatusChange}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
            </div>
          </PmSection>

          {isLoading ? (
            viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />
          ) : isError ? (
            <PmPanel className="flex flex-1 items-center justify-center">
              <ErrorState onRetry={handleRetry} className="border-0 bg-transparent" />
            </PmPanel>
          ) : projects.length === 0 && !debouncedSearch && status === "ALL" ? (
            <PmPanel className="flex flex-1 items-center justify-center">
              <ProjectsEmptyState onCreate={handleOpenCreate} />
            </PmPanel>
          ) : projects.length === 0 ? (
            <PmPanel className="flex flex-1 items-center justify-center">
              <EmptyState
                illustration={<EmptySearchIllustration className="h-28 w-28" />}
                title="No projects match your filters"
                description="Try adjusting the search or status filter."
                action={{
                  label: "Clear all filters",
                  onClick: handleClearFilters,
                }}
              />
            </PmPanel>
          ) : viewMode === "grid" ? (
            <div role="list" aria-label="Projects grid">
              <PmStaggerList className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
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
            <ProjectTable projects={projects} />
          )}

          {pagination && pagination.totalPages > 1 ? (
            <ProjectPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </PmPageShell>
      </PageWrapper>
    </RequireModule>
  );
}
