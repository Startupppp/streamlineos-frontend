"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/ui/page-header";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectCard } from "./project-card";
import { ProjectListRow } from "./project-list-row";
import { ProjectFilterBar } from "./project-filter-bar";
import { ProjectPagination } from "./project-pagination";
import { LaunchProjectCard } from "./launch-project-card";
import { ProjectsEmptyState } from "./projects-empty-state";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useDebouncedValue } from "@/hooks/use-expense-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
type ViewMode = "grid" | "list";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  // Reset page on filter changes
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  }, []);

  const { data, isLoading } = api.project.getProjectsListing.useQuery({
    page,
    limit: 9,
    search: debouncedSearch || undefined,
    status,
  });

  const projects = data?.data ?? [];
  const pagination = data?.pagination;

  const description = useMemo(() => {
    if (!pagination) return "";
    const total = pagination.total;
    return `${total} project${total !== 1 ? "s" : ""} found`;
  }, [pagination]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={description}
        actions={<NewProjectDialog />}
      />

      <ProjectFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* SR live region for result count */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading ? "Loading projects..." : `${pagination?.total ?? 0} projects found`}
      </div>

      {/* Content */}
      {isLoading ? (
        <ProjectsGridSkeleton />
      ) : projects.length === 0 && !debouncedSearch && status === "ALL" ? (
        <ProjectsEmptyState />
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">No projects match your filters.</p>
          <button
            onClick={() => { setSearch(""); setStatus("ALL"); setPage(1); }}
            className="text-primary text-sm mt-2 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Projects grid"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {projects.map((project) => (
            <motion.div key={project.id} variants={fadeUp}>
              <ProjectCard project={project} />
            </motion.div>
          ))}
          <motion.div variants={fadeUp}>
            <LaunchProjectCard onClick={() => setLaunchDialogOpen(true)} />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-2"
          role="list"
          aria-label="Projects list"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {projects.map((project) => (
            <motion.div key={project.id} variants={fadeUp}>
              <ProjectListRow project={project} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {pagination && (
        <ProjectPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Hidden dialog triggered by LaunchProjectCard */}
      <NewProjectDialog
        trigger={<span className="hidden" />}
        open={launchDialogOpen}
        onOpenChange={setLaunchDialogOpen}
      />
    </div>
  );
}

function ProjectsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-7 w-7 rounded" />
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <div>
              <Skeleton className="h-5 w-3/4 mb-1" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </CardContent>
          <CardFooter className="justify-between pt-3 border-t border-border/50">
            <div className="flex -space-x-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-7 w-7 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-3 w-20" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
