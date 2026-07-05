"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  TrendingUp,
} from "lucide-react";
import { useProjects } from "@/hooks/api/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { RequireModule } from "@/components/auth/require-module";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { PortfolioSkeleton } from "@/features/projects/portfolio/portfolio-skeleton";
import { ProjectTableRow } from "@/features/projects/portfolio/project-table-row";
import { ProjectHealthCard } from "@/features/projects/portfolio/project-health-card";
import {
  STATUS_FILTER_OPTIONS,
  SORT_OPTIONS,
  type StatusFilter,
  type SortKey,
  type ViewMode,
} from "@/features/projects/portfolio/portfolio-config";

export default function PortfolioPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<SortKey>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const { data, isLoading, isError, refetch } = useProjects({ limit: 100 });

  const stats = useMemo(() => {
    const all = data?.data ?? [];
    return {
      total: all.length,
      active: all.filter((p) => p.status === "ACTIVE").length,
      completed: all.filter((p) => p.status === "COMPLETED").length,
      archived: all.filter((p) => p.status === "ARCHIVED").length,
    };
  }, [data?.data]);

  const projects = useMemo(() => {
    let list = data?.data ?? [];
    if (statusFilter !== "ALL") list = list.filter((p) => p.status === statusFilter);
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "status") return (a.status ?? "").localeCompare(b.status ?? "");
      if (sort === "progress") return b.progress.percentage - a.progress.percentage;
      return 0;
    });
  }, [data?.data, statusFilter, sort]);

  const handleStatusChange = useCallback((v: string) => setStatusFilter(v as StatusFilter), []);
  const handleSortChange = useCallback((v: string) => setSort(v as SortKey), []);
  const handleRetry = useCallback(() => refetch(), [refetch]);
  const handleSetTableView = useCallback(() => setViewMode("table"), []);
  const handleSetCardsView = useCallback(() => setViewMode("cards"), []);

  const filters = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center bg-muted/40 rounded-lg p-0.5 border border-border">
        <button
          type="button"
          onClick={handleSetTableView}
          className={cn(
            "h-7 px-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
            viewMode === "table"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <List className="h-3.5 w-3.5" /> Table
        </button>
        <button
          type="button"
          onClick={handleSetCardsView}
          className={cn(
            "h-7 px-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
            viewMode === "cards"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Cards
        </button>
      </div>
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={handleSortChange}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <RequireModule module="PROJECTS">
      <PageWrapper title="Portfolio" badge={data ? String(stats.total) : undefined} filters={filters}>
        {isLoading ? (
          <PortfolioSkeleton />
        ) : isError ? (
          <ErrorState onRetry={handleRetry} className="flex-1" />
        ) : (
          <>
            <StatCardGrid cols={4} className="mb-4">
              <StatCard label="Total" value={stats.total} icon={Briefcase} tone="default" />
              <StatCard label="Active" value={stats.active} icon={TrendingUp} tone="blue" />
              <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="emerald" />
              <StatCard label="Archived" value={stats.archived} icon={Clock} tone="default" />
            </StatCardGrid>

            {projects.length === 0 ? (
              <EmptyState
                title="No projects found"
                description="Create a project to see it in the portfolio view."
                action={{ label: "Go to Projects", href: "/projects" }}
              />
            ) : viewMode === "table" ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_minmax(100px,140px)_auto_auto] gap-3 px-4 py-2 bg-muted/40 border-b border-border">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Project</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Health</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Progress</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Due Date</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Manager</span>
                </div>
                <div className="divide-y divide-border/50">
                  {projects.map((project) => (
                    <ProjectTableRow key={project.id} project={project} />
                  ))}
                </div>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {projects.map((project) => (
                  <motion.div key={project.id} variants={fadeUp} className="h-full">
                    <ProjectHealthCard project={project} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </PageWrapper>
    </RequireModule>
  );
}
