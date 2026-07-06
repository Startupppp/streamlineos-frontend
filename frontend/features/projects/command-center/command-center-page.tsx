"use client";

import { memo, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, CheckSquare, AlertCircle, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/api/projects/projects";
import { useMyWork } from "@/hooks/api/projects/my-work";
import type { MyWorkItem } from "@/types/projects/my-work";
import type { ProjectListItem } from "@/types/projects";
import { isPast, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-emerald-700 border-emerald-300 bg-emerald-50",
  PLANNING: "text-blue-700 border-blue-300 bg-blue-50",
  ON_HOLD: "text-amber-700 border-amber-300 bg-amber-50",
  COMPLETED: "text-slate-600 border-slate-300 bg-slate-100",
  ARCHIVED: "text-slate-500 border-slate-200 bg-slate-50",
};

function isOverdue(item: MyWorkItem): boolean {
  if (!item.dueDate) return false;
  try {
    const d = parseISO(item.dueDate);
    return isPast(d) && !isToday(d) && item.status !== "DONE";
  } catch {
    return false;
  }
}

const MyWorkRow = memo(function MyWorkRow({ item, index }: { item: MyWorkItem; index: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: "easeOut" }}
    >
      <Link
        href={`/projects/${item.projectId}?ticket=${item.id}`}
        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors group border border-transparent hover:border-border/50"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{item.title}</p>
          <span className="text-[10px] text-blue-600 font-medium">{item.projectKey}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isOverdue(item) && (
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          )}
          <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">
            {item.status.replace(/_/g, " ")}
          </Badge>
          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>
    </motion.div>
  );
});

const ProjectCard = memo(function ProjectCard({ project, index }: { project: ProjectListItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: "easeOut" }}
    >
      <Link
        href={`/projects/${project.id}`}
        className="flex items-center gap-3 px-3 py-2.5 bg-card rounded-lg border border-border hover:shadow-sm hover:border-border/80 transition-all group"
      >
        <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
          {project.key.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
          {project.description && (
            <p className="text-[11px] text-muted-foreground truncate">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {project.progress && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-[width] duration-500"
                  style={{ width: `${project.progress.percentage}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {project.progress.percentage}%
              </span>
            </div>
          )}
          {project.status && (
            <Badge
              variant="outline"
              className={cn("text-[10px] py-0 h-4 px-1.5", STATUS_COLOR[project.status] ?? "")}
            >
              {project.status.replace(/_/g, " ")}
            </Badge>
          )}
          <ChevronRight className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-opacity",
            "opacity-0 group-hover:opacity-100",
          )} />
        </div>
      </Link>
    </motion.div>
  );
});

export function CommandCenterPage() {
  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useProjects({ status: "ACTIVE" });

  const {
    data: myWork,
    isLoading: workLoading,
    isError: workError,
    refetch: refetchWork,
  } = useMyWork();

  const handleRetry = useCallback(() => {
    void refetchProjects();
    void refetchWork();
  }, [refetchProjects, refetchWork]);

  const stats = useMemo(() => {
    const projects = projectsData?.data ?? [];
    const work = myWork ?? [];
    const openTickets = work.filter((i) => i.status !== "DONE" && i.status !== "CANCELLED");
    const overdueTickets = work.filter(isOverdue);
    return {
      activeProjects: projects.length,
      openTickets: openTickets.length,
      overdueTickets: overdueTickets.length,
    };
  }, [projectsData, myWork]);

  const topWork = useMemo(
    () => (myWork ?? []).filter((i) => i.status !== "DONE").slice(0, 5),
    [myWork],
  );

  const projects = projectsData?.data ?? [];
  const isLoading = projectsLoading || workLoading;
  const isError = projectsError || workError;

  if (isLoading) {
    return (
      <PageWrapper title="Command Center" variant="display">
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Command Center" variant="display">
        <ErrorState
          title="Failed to load command center"
          description="Could not fetch project data. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Command Center" variant="display" subtitle="Overview of your projects and active work">
      <div className="space-y-6">
        <StatCardGrid cols={3}>
          <StatCard
            label="Active Projects"
            value={stats.activeProjects}
            icon={Briefcase}
            tone="blue"
            index={0}
          />
          <StatCard
            label="Open Tickets"
            value={stats.openTickets}
            icon={CheckSquare}
            tone="emerald"
            index={1}
          />
          <StatCard
            label="Overdue"
            value={stats.overdueTickets}
            icon={AlertCircle}
            tone={stats.overdueTickets > 0 ? "red" : "default"}
            index={2}
          />
        </StatCardGrid>

        <PageSection
          title="My Work"
          actions={
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
              <Link href="/projects/my-work">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          }
        >
          {topWork.length === 0 ? (
            <EmptyState
              illustrationPreset="projects"
              title="No open tickets"
              description="You have no open tickets across any project."
              className="min-h-[12rem]"
            />
          ) : (
            <div className="space-y-0.5 bg-card rounded-lg border border-border overflow-hidden">
              {topWork.map((item, i) => (
                <MyWorkRow key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </PageSection>

        <PageSection
          title="Active Projects"
          actions={
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
              <Link href="/projects">
                All projects <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          }
        >
          {projects.length === 0 ? (
            <EmptyState
              illustrationPreset="projects"
              title="No active projects"
              description="Active projects will appear here."
              className="min-h-[12rem]"
            />
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 8).map((project, idx) => (
                <ProjectCard key={project.id} project={project} index={idx} />
              ))}
            </div>
          )}
        </PageSection>
      </div>
    </PageWrapper>
  );
}
