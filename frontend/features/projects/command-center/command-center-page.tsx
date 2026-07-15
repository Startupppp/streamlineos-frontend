"use client";

import {
  useMemo,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase, CheckSquare, AlertCircle } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { useProjects } from "@/hooks/api/projects/projects";
import { useMyWork } from "@/hooks/api/projects/my-work";
import { useCommandPalette } from "@/features/command-palette/hooks/use-command-palette";
import { ProjectCreateWizard } from "@/features/projects/project-create/project-create-wizard";
import {
  CreateIssueButton,
  PinnedNav,
  QuickCreateMenu,
} from "./command-center-actions";
import { isOverdue, MyWorkRow, ProjectCard } from "./command-center-rows";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PmStaggerList,
  PM_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { pmSnappy } from "@/features/projects/shared/pm-motion";
import { cn } from "@/lib/utils";

function useKeyboardShortcuts(
  onCreateProject: () => void,
  onCreateIssue: () => void,
) {
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
        const searchEl = document.querySelector<HTMLElement>("[data-search-input]");
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

      if (pendingKey === "g" && e.key === "p") {
        setPendingKey(null);
        router.push("/projects/all");
        return;
      }

      if (pendingKey === "c" && e.key === "p") {
        setPendingKey(null);
        onCreateProject();
        return;
      }

      if (pendingKey === "c" && e.key === "t") {
        setPendingKey(null);
        onCreateIssue();
        return;
      }

      setPendingKey(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [pendingKey, onCreateProject, onCreateIssue, router]);
}

type EmptyAction = { label: string; onClick?: () => void; href?: string };

function resolveMyIssuesEmptyActions(params: {
  canCreateIssue: boolean;
  canCreateProject: boolean;
  hasProjects: boolean;
  onCreateIssue: () => void;
  onCreateProject: () => void;
}): { action: EmptyAction; secondaryAction?: EmptyAction } {
  const { canCreateIssue, canCreateProject, hasProjects, onCreateIssue, onCreateProject } =
    params;
  if (hasProjects && canCreateIssue) {
    return {
      action: { label: "New issue", onClick: onCreateIssue },
      secondaryAction: { label: "View all", href: "/projects/my-work" },
    };
  }
  if (canCreateProject) {
    return {
      action: { label: "New project", onClick: onCreateProject },
      secondaryAction: hasProjects
        ? { label: "View all", href: "/projects/my-work" }
        : { label: "All projects", href: "/projects/all" },
    };
  }
  if (hasProjects) {
    return { action: { label: "View all", href: "/projects/my-work" } };
  }
  return { action: { label: "All projects", href: "/projects/all" } };
}

const STAT_GLASS =
  "border-border/60 bg-card/50 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/40 hover:border-primary/20 hover:shadow-md";

function PanelHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
      <h2 className="min-w-0 truncate text-xs font-semibold tracking-wide text-foreground">
        {title}
      </h2>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      ) : null}
    </div>
  );
}

export function CommandCenterPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { openCreateTicket } = useCommandPalette();
  const canCreateIssue = useCan("projects:tickets:create");
  const canCreateProject = useCan("projects:create");
  const shouldReduceMotion = useReducedMotion();

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

  const handleOpenWizard = useCallback(() => {
    if (!canCreateProject) return;
    setWizardOpen(true);
  }, [canCreateProject]);

  const projects = useMemo(() => projectsData?.data ?? [], [projectsData]);

  const handleCreateForProject = useCallback(
    (projectId: number) => {
      openCreateTicket(projectId);
    },
    [openCreateTicket],
  );

  const handleCreateIssueShortcut = useCallback(() => {
    if (!canCreateIssue) return;
    if (projects.length === 0) return;
    openCreateTicket();
  }, [canCreateIssue, projects.length, openCreateTicket]);

  useKeyboardShortcuts(handleOpenWizard, handleCreateIssueShortcut);

  const handleRetry = useCallback(() => {
    void refetchProjects();
    void refetchWork();
  }, [refetchProjects, refetchWork]);

  const stats = useMemo(() => {
    const projectList = projectsData?.data ?? [];
    const work = myWork ?? [];
    const openIssues = work.filter(
      (i) => i.status !== "DONE" && i.status !== "CANCELLED",
    );
    const overdueIssues = work.filter(isOverdue);
    return {
      activeProjects: projectList.length,
      openIssues: openIssues.length,
      overdueIssues: overdueIssues.length,
    };
  }, [projectsData, myWork]);

  const topWork = useMemo(
    () => (myWork ?? []).filter((i) => i.status !== "DONE").slice(0, 8),
    [myWork],
  );

  const myIssuesEmpty = useMemo(
    () =>
      resolveMyIssuesEmptyActions({
        canCreateIssue,
        canCreateProject,
        hasProjects: projects.length > 0,
        onCreateIssue: handleCreateIssueShortcut,
        onCreateProject: handleOpenWizard,
      }),
    [
      canCreateIssue,
      canCreateProject,
      projects.length,
      handleCreateIssueShortcut,
      handleOpenWizard,
    ],
  );

  const isLoading = projectsLoading || workLoading;
  const isError = projectsError || workError;

  if (isLoading) {
    return (
      <PageWrapper title="Home">
        <PmPageShell>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className={cn("h-16 rounded-xl", PM_PANEL)} />
            ))}
          </div>
          <Skeleton className={cn("h-14 w-full max-w-xl rounded-xl", PM_PANEL)} />
          <Skeleton className={cn("h-56 rounded-xl", PM_PANEL)} />
          <Skeleton className={cn("h-48 rounded-xl", PM_PANEL)} />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Home">
        <PmPageShell withGlow={false}>
          <ErrorState
            title="Failed to load home"
            description="Could not fetch project data. Please try again."
            onRetry={handleRetry}
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Home"
        subtitle="Your issues, projects, and shortcuts"
        actions={
          <QuickCreateMenu
            projects={projects}
            onCreateProject={handleOpenWizard}
            onCreateForProject={handleCreateForProject}
            onCreateIssue={handleCreateIssueShortcut}
          />
        }
      >
        <PmPageShell>
          <PmSection index={0}>
            <StatCardGrid cols={3}>
              <motion.div
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                transition={pmSnappy}
              >
                <StatCard
                  label="Projects"
                  value={stats.activeProjects}
                  icon={Briefcase}
                  tone="default"
                  index={0}
                  href="/projects/all"
                  className={STAT_GLASS}
                />
              </motion.div>
              <motion.div
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                transition={pmSnappy}
              >
                <StatCard
                  label="Open issues"
                  value={stats.openIssues}
                  icon={CheckSquare}
                  tone="emerald"
                  index={1}
                  href="/projects/my-work"
                  className={STAT_GLASS}
                />
              </motion.div>
              <motion.div
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                transition={pmSnappy}
                animate={
                  stats.overdueIssues > 0 && !shouldReduceMotion
                    ? { scale: [1, 1.015, 1] }
                    : undefined
                }
              >
                <StatCard
                  label="Overdue"
                  value={stats.overdueIssues}
                  icon={AlertCircle}
                  tone={stats.overdueIssues > 0 ? "red" : "default"}
                  index={2}
                  href="/projects/my-work"
                  className={STAT_GLASS}
                />
              </motion.div>
            </StatCardGrid>
          </PmSection>

          <PmSection index={1}>
            <PmPanel className="p-2.5">
              <p className="mb-1.5 px-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Jump to
              </p>
              <PinnedNav />
            </PmPanel>
          </PmSection>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
            <PmSection index={2} className="flex min-h-0 flex-col lg:col-span-3">
              <PmPanel className="flex min-h-0 flex-1 flex-col">
                <PanelHeader
                  title="My issues"
                  actions={
                    <>
                      <CreateIssueButton
                        projects={projects}
                        onCreateForProject={handleCreateForProject}
                        onCreateIssue={handleCreateIssueShortcut}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        asChild
                      >
                        <Link href="/projects/my-work">
                          View all <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </>
                  }
                />
                <div className="min-h-0 flex-1">
                  {topWork.length === 0 ? (
                    <EmptyState
                      illustrationPreset="projects"
                      title="Inbox zero"
                      description={
                        projects.length === 0
                          ? "Create a project to start tracking issues."
                          : "No open issues assigned to you. Create one or open the board."
                      }
                      className="min-h-[12rem]"
                      action={myIssuesEmpty.action}
                      secondaryAction={myIssuesEmpty.secondaryAction}
                    />
                  ) : (
                    <PmStaggerList>
                      {topWork.map((item) => (
                        <MyWorkRow key={item.id} item={item} />
                      ))}
                    </PmStaggerList>
                  )}
                </div>
              </PmPanel>
            </PmSection>

            <PmSection index={3} className="flex min-h-0 flex-col lg:col-span-2">
              <PmPanel className="flex min-h-0 flex-1 flex-col">
                <PanelHeader
                  title="Projects"
                  actions={
                    <>
                      {canCreateProject ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-muted-foreground"
                          onClick={handleOpenWizard}
                        >
                          New
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        asChild
                      >
                        <Link href="/projects/all">
                          All <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </>
                  }
                />
                <div className="min-h-0 flex-1 p-1.5">
                  {projects.length === 0 ? (
                    <EmptyState
                      illustrationPreset="projects"
                      title="No projects yet"
                      description="Create a project to start shipping."
                      className="min-h-[12rem]"
                      action={
                        canCreateProject
                          ? { label: "New project", onClick: handleOpenWizard }
                          : { label: "All projects", href: "/projects/all" }
                      }
                    />
                  ) : (
                    <PmStaggerList className="flex flex-col gap-1">
                      {projects.slice(0, 8).map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onCreateIssue={
                            canCreateIssue ? handleCreateForProject : undefined
                          }
                        />
                      ))}
                    </PmStaggerList>
                  )}
                </div>
              </PmPanel>
            </PmSection>
          </div>

          <motion.p
            className="text-center text-[10px] text-muted-foreground/70"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...pmSnappy, delay: 0.28 }}
          >
            Shortcuts · <kbd className="rounded border border-border bg-muted/80 px-1">C</kbd>
            <kbd className="ml-0.5 rounded border border-border bg-muted/80 px-1">P</kbd> project ·{" "}
            <kbd className="rounded border border-border bg-muted/80 px-1">C</kbd>
            <kbd className="ml-0.5 rounded border border-border bg-muted/80 px-1">T</kbd> issue ·{" "}
            <kbd className="rounded border border-border bg-muted/80 px-1">G</kbd>
            <kbd className="ml-0.5 rounded border border-border bg-muted/80 px-1">M</kbd> my issues ·{" "}
            <kbd className="rounded border border-border bg-muted/80 px-1">G</kbd>
            <kbd className="ml-0.5 rounded border border-border bg-muted/80 px-1">P</kbd> projects
          </motion.p>
        </PmPageShell>
      </PageWrapper>

      <ProjectCreateWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
