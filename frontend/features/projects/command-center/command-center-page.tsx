"use client";

import { memo, useMemo, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Briefcase,
  CheckSquare,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  Plus,
  FolderPlus,
  ListPlus,
  GitBranch,
  CircleCheck,
  LayoutGrid,
  LayoutList,
  GanttChart,
  BarChart2,
  Settings,
  ExternalLink,
} from "lucide-react";
import { useProjects } from "@/hooks/api/projects/projects";
import { useMyWork } from "@/hooks/api/projects/my-work";
import { ProjectCreateWizard } from "@/features/projects/project-create/project-create-wizard";
import type { MyWorkItem } from "@/types/projects/my-work";
import type { ProjectListItem } from "@/types/projects";
import { isPast, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  PLANNING: "text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  ON_HOLD: "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  COMPLETED: "text-muted-foreground border-border bg-muted dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  ARCHIVED: "text-muted-foreground border-border bg-muted dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
};

const PINNED_LINKS = [
  { label: "My Work", href: "/projects/my-work", icon: LayoutList },
  { label: "All Work", href: "/projects/all-work", icon: LayoutGrid },
  { label: "Approvals", href: "/projects/approvals", icon: CircleCheck },
  { label: "Roadmap", href: "/projects/roadmap", icon: GanttChart },
  { label: "Portfolios", href: "/projects/portfolios", icon: Briefcase },
  { label: "Resources", href: "/projects/resource-allocation", icon: BarChart2 },
];

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
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{item.projectKey}</span>
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
  const base = `/projects/${project.id}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: "easeOut" }}
      className="group"
    >
      <div className="flex items-center gap-3 px-3 py-2.5 bg-card rounded-lg border border-border hover:shadow-sm hover:border-border/80 transition-all">
        <Link href={base} className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
          {project.key.substring(0, 2).toUpperCase()}
        </Link>
        <Link href={base} className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
          {project.description && (
            <p className="text-[11px] text-muted-foreground truncate">{project.description}</p>
          )}
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          {project.progress && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-[width] duration-300"
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
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={base}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Open Board"
                  >
                    <LayoutGrid className="h-3 w-3" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Board</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`${base}/backlog`}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Open Backlog"
                  >
                    <LayoutList className="h-3 w-3" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Backlog</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`${base}?create=1`}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="New Task"
                  >
                    <ListPlus className="h-3 w-3" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">New Task</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`${base}/sprints`}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="New Sprint"
                  >
                    <GitBranch className="h-3 w-3" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">New Sprint</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`${base}/settings`}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Settings"
                  >
                    <Settings className="h-3 w-3" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

function QuickCreateMenu({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onCreateProject} className="gap-2 cursor-pointer">
          <FolderPlus className="h-4 w-4 text-muted-foreground" />
          <span>Create Project</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">C P</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link href="/projects/my-work">
            <ListPlus className="h-4 w-4 text-muted-foreground" />
            <span>Create Task</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">C T</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link href="/projects/approvals">
            <CircleCheck className="h-4 w-4 text-muted-foreground" />
            <span>Create Approval</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PinnedNav() {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PINNED_LINKS.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/30 transition-colors"
        >
          <Icon className="h-3 w-3" />
          {label}
          <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
    </div>
  );
}

function useKeyboardShortcuts(onCreateProject: () => void) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        const searchEl = document.querySelector<HTMLElement>('[data-search-input]');
        searchEl?.focus();
        return;
      }

      if (e.key === "g" && !pendingKey) {
        setPendingKey("g");
        timer = setTimeout(() => setPendingKey(null), 1000);
        return;
      }

      if (e.key === "c" && !pendingKey) {
        setPendingKey("c");
        timer = setTimeout(() => setPendingKey(null), 1000);
        return;
      }

      if (pendingKey === "g" && e.key === "m") {
        setPendingKey(null);
        router.push("/projects/my-work");
        return;
      }

      if (pendingKey === "c" && e.key === "p") {
        setPendingKey(null);
        onCreateProject();
        return;
      }

      if (pendingKey === "c" && e.key === "t") {
        setPendingKey(null);
        router.push("/projects/my-work");
        return;
      }

      setPendingKey(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [pendingKey, onCreateProject, router]);
}

export function CommandCenterPage() {
  const [wizardOpen, setWizardOpen] = useState(false);

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

  const handleOpenWizard = useCallback(() => setWizardOpen(true), []);

  useKeyboardShortcuts(handleOpenWizard);

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
      <PageWrapper title="Command Center" eyebrow="Projects">
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
      <PageWrapper title="Command Center" eyebrow="Projects">
        <ErrorState
          title="Failed to load command center"
          description="Could not fetch project data. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Command Center"
        eyebrow="Projects"
        subtitle="Overview of your projects and active work"
        actions={<QuickCreateMenu onCreateProject={handleOpenWizard} />}
      >
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

          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Quick navigation</p>
            <PinnedNav />
          </div>

          <PageSection
            title="My Work"
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  asChild
                >
                  <Link href="/projects/my-work">
                    Create Task
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                  <Link href="/projects/my-work">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
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
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={handleOpenWizard}
                >
                  Create Project
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                  <Link href="/projects/all">
                    All projects <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            }
          >
            {projects.length === 0 ? (
              <EmptyState
                illustrationPreset="projects"
                title="No active projects"
                description="Active projects will appear here."
                className="min-h-[12rem]"
                action={{ label: "Create Project", onClick: handleOpenWizard }}
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

      <ProjectCreateWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
