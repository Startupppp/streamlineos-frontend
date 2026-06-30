"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useProjects } from "@/hooks/api/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/types/projects";
import type { ProjectStatusValue } from "@/types/projects";

type StatusFilter = "ALL" | ProjectStatusValue;
type SortKey = "name" | "status" | "progress";

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function getProjectHealth(project: ProjectListItem): "on-track" | "at-risk" | "critical" {
  if (project.status === "COMPLETED") return "on-track";
  if (project.status === "ARCHIVED") return "critical";
  const end = toDate(project.endDate);
  if (end && end < new Date()) return "critical";
  return "on-track";
}

const healthConfig = {
  "on-track": {
    label: "On Track",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
  },
  "at-risk": {
    label: "At Risk",
    color: "text-amber-600",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
  critical: {
    label: "Critical",
    color: "text-red-600",
    bg: "bg-red-50",
    dot: "bg-red-500",
  },
} as const;

const statusConfig: Record<ProjectStatusValue, { label: string; color: string }> = {
  ACTIVE: { label: "Active", color: "bg-blue-100 text-blue-700 border-blue-200" },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ARCHIVED: { label: "Archived", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

const DEFAULT_STATUS_CONFIG = { label: "Unknown", color: "bg-slate-100 text-slate-600 border-slate-200" };

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
  { value: "progress", label: "Progress" },
];

function PortfolioSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/80 p-4 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ProjectHealthCard({ project }: { project: ProjectListItem }) {
  const health = getProjectHealth(project);
  const hc = healthConfig[health];
  const sc = project.status ? (statusConfig[project.status] ?? DEFAULT_STATUS_CONFIG) : DEFAULT_STATUS_CONFIG;
  const endDate = toDate(project.endDate);
  const managerName =
    project.manager
      ? [project.manager.firstName, project.manager.lastName].filter(Boolean).join(" ") || null
      : null;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow h-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-bold text-slate-400 font-mono shrink-0">{project.key}</span>
          <h3 className="font-semibold text-slate-900 truncate text-sm">{project.name}</h3>
        </div>
        <Badge variant="outline" className={cn("text-[10px] shrink-0 border", sc.color)}>
          {sc.label}
        </Badge>
      </div>

      {project.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className={cn("flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium", hc.bg, hc.color)}>
          <div className={cn("h-1.5 w-1.5 rounded-full", hc.dot)} />
          {hc.label}
        </div>
        {project.progress.total > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {project.progress.percentage}% done
          </span>
        )}
      </div>

      {project.progress.total > 0 && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${project.progress.percentage}%` }}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        {endDate && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            Due {format(endDate, "MMM d, yyyy")}
          </p>
        )}
        {managerName && (
          <p className="text-[11px] text-muted-foreground truncate">
            Manager: {managerName}
          </p>
        )}
      </div>

      <div className="mt-auto pt-2 border-t border-slate-100">
        <Link href={`/projects/${project.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 -ml-1"
          >
            View Project
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<SortKey>("name");

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
    if (statusFilter !== "ALL") {
      list = list.filter((p) => p.status === statusFilter);
    }
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

  const filters = (
    <div className="flex items-center gap-2">
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={handleSortChange}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (isLoading) {
    return (
      <PageWrapper title="Portfolio" filters={filters}>
        <PortfolioSkeleton />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Portfolio" filters={filters}>
        <ErrorState onRetry={handleRetry} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Portfolio"
      badge={String(stats.total)}
      filters={filters}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total" value={stats.total} icon={Briefcase} color="text-violet-600" />
        <StatCard label="Active" value={stats.active} icon={TrendingUp} color="text-blue-600" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Archived" value={stats.archived} icon={Clock} color="text-slate-500" />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Create a project to see it in the portfolio view."
          action={{ label: "Go to Projects", href: "/projects" }}
        />
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
    </PageWrapper>
  );
}
