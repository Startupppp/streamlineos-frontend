"use client";

import { useCallback, useState, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";

type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
type ViewMode = "grid" | "list";

const STATUS_FILTERS: readonly StatusFilter[] = ["ALL", "ACTIVE", "COMPLETED", "ARCHIVED"];
const VIEW_MODES: readonly ViewMode[] = ["grid", "list"];

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
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
      filters={
        <ProjectFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          status={status}
          onStatusChange={handleStatusChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      }
    >
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-14 rounded" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1 w-full rounded-full" />
                <div className="flex justify-between pt-2 border-t">
                  <div className="flex -space-x-1.5">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-6 w-6 rounded-full" />
                    ))}
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="bg-muted/30 border-b border-border px-3 py-2 flex items-center gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-14 ml-auto hidden sm:block" />
              <Skeleton className="h-3 w-12 hidden md:block" />
              <Skeleton className="h-3 w-14 hidden lg:block" />
              <Skeleton className="h-3 w-16 hidden sm:block" />
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-0">
                <Skeleton className="h-6 w-6 rounded shrink-0" />
                <Skeleton className="h-4 flex-1 max-w-[240px]" />
                <Skeleton className="h-3 w-12 hidden sm:block shrink-0" />
                <Skeleton className="h-5 w-20 rounded-full ml-auto shrink-0" />
                <div className="hidden md:flex items-center gap-1.5 shrink-0">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-14 hidden lg:block shrink-0" />
                <div className="hidden sm:flex items-center gap-2 w-[130px] shrink-0">
                  <Skeleton className="h-1 flex-1 rounded-full" />
                  <Skeleton className="h-3 w-7" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : isError ? (
        <ErrorState onRetry={handleRetry} />
      ) : projects.length === 0 && !debouncedSearch && status === "ALL" ? (
        <ProjectsEmptyState />
      ) : projects.length === 0 ? (
        <EmptyState
          illustration={<EmptySearchIllustration className="h-32 w-32" />}
          title="No projects match your filters"
          description="Try adjusting the search or status filter."
          action={{
            label: "Clear all filters",
            onClick: handleClearFilters,
          }}
        />
      ) : viewMode === "grid" ? (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Projects grid"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {projects.map((project) => (
            <motion.div key={project.id} variants={fadeUp} className="h-full">
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <ProjectTable projects={projects} />
      )}

      {pagination && pagination.totalPages > 1 && (
        <ProjectPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </PageWrapper>
    </RequireModule>
  );
}
