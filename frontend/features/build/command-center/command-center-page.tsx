"use client";

import { useMemo, useCallback, useState, type UIEvent } from "react";
import dynamic from "next/dynamic";
import { format, subDays } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { Briefcase, CheckSquare, AlertCircle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useProjects } from "@/hooks/api/build/projects";
import {
  COMMAND_CENTER_MY_ISSUES_FILTERS,
  useAllWork,
  useInfiniteAllWork,
} from "@/hooks/api/build/all-work";
import { useCommandPalette } from "@/components/command-palette/hooks/use-command-palette";
import { QuickCreateMenu, PinnedNav } from "./command-center-actions";
import {
  PmPageShell,
  PmSection,
  PmPanel,
  PM_PANEL,
} from "@/components/pm-chrome";
import { pmSnappy } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import {
  resolveMyIssuesEmptyActions,
  mapAllWorkTicketToMyWorkItem,
} from "./command-center-utils";
import {
  MY_ISSUES_LOAD_MORE_THRESHOLD,
  COMMAND_CENTER_PAGE_SHELL,
  COMMAND_CENTER_JUMP_PANEL,
  COMMAND_CENTER_PANELS_GRID,
} from "./command-center-constants";
import { MyIssuesPanel } from "./command-center-my-issues-panel";
import { ProjectsPanel } from "./command-center-projects-panel";

const ProjectCreateWizard = dynamic(
  () =>
    import("@/features/build/project-create/project-create-wizard").then(
      (m) => m.ProjectCreateWizard,
    ),
  { ssr: false },
);

export function resolveProjectsStatValue(count: number, hasMore: boolean): string | number {
  if (hasMore) return `${count}+`;
  return count;
}

function CommandCenterLoading() {
  return (
    <PmPageShell className={COMMAND_CENTER_PAGE_SHELL}>
      <div className="min-w-0 w-full max-w-full">
        <StatCardGridSkeleton cols={3} />
      </div>
      <Skeleton className={cn("h-56 rounded-xl", PM_PANEL)} />
      <Skeleton className={cn("h-48 rounded-xl", PM_PANEL)} />
      <div className="grid min-w-0 w-full max-w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className={cn("h-28 rounded-xl", PM_PANEL)} />
        ))}
      </div>
    </PmPageShell>
  );
}

export function CommandCenterPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { openCreateTicket } = useCommandPalette();
  const canCreateIssue = useCan("build:tickets:create");
  const canCreateProject = useCan("build:create");
  const canViewTickets = useCan("build:tickets:view");
  const shouldReduceMotion = useReducedMotion();
  const overdueDueDateTo = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
    error: projectsRawError,
    refetch: refetchProjects,
  } = useProjects({ status: "ACTIVE" });

  const {
    data: myIssuesPages,
    isLoading: myIssuesLoading,
    isError: myIssuesError,
    error: myIssuesRawError,
    refetch: refetchMyIssues,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAllWork(COMMAND_CENTER_MY_ISSUES_FILTERS, { enabled: canViewTickets });

  const {
    data: openIssuesSummary,
    refetch: refetchOpenIssuesSummary,
  } = useAllWork(
    { ...COMMAND_CENTER_MY_ISSUES_FILTERS, limit: 1 },
    { enabled: canViewTickets },
  );

  const {
    data: overdueIssuesSummary,
    refetch: refetchOverdueIssuesSummary,
  } = useAllWork(
    { ...COMMAND_CENTER_MY_ISSUES_FILTERS, limit: 1, dueDateTo: overdueDueDateTo },
    { enabled: canViewTickets },
  );

  const projects = useMemo(() => projectsData?.data ?? [], [projectsData]);

  const handleOpenWizard = useCallback(() => {
    if (!canCreateProject) return;
    setWizardOpen(true);
  }, [canCreateProject]);

  const handleCreateForProject = useCallback(
    (projectId: number) => openCreateTicket(projectId),
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
    void refetchMyIssues();
    void refetchOpenIssuesSummary();
    void refetchOverdueIssuesSummary();
  }, [
    refetchMyIssues,
    refetchOpenIssuesSummary,
    refetchOverdueIssuesSummary,
    refetchProjects,
  ]);

  const handleMyIssuesRetry = useCallback(() => void refetchMyIssues(), [refetchMyIssues]);

  const myWorkItems = useMemo(() => {
    if (!myIssuesPages?.pages) return [];
    return myIssuesPages.pages.flatMap((page) =>
      page.data.map(mapAllWorkTicketToMyWorkItem),
    );
  }, [myIssuesPages]);

  const stats = useMemo(() => {
    const projectList = projectsData?.data ?? [];
    return {
      activeProjects: resolveProjectsStatValue(projectList.length, projectsData?.hasMore ?? false),
      openIssues: openIssuesSummary?.total ?? openIssuesSummary?.data.length ?? 0,
      overdueIssues: overdueIssuesSummary?.total ?? overdueIssuesSummary?.data.length ?? 0,
    };
  }, [projectsData, openIssuesSummary, overdueIssuesSummary]);

  const myIssuesEmpty = useMemo(
    () =>
      resolveMyIssuesEmptyActions({
        canCreateIssue,
        canCreateProject,
        hasProjects: projects.length > 0,
        onCreateIssue: handleCreateIssueShortcut,
        onCreateProject: handleOpenWizard,
      }),
    [canCreateIssue, canCreateProject, projects.length, handleCreateIssueShortcut, handleOpenWizard],
  );

  const handleMyIssuesScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom <= MY_ISSUES_LOAD_MORE_THRESHOLD && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const pageState = usePageState({
    permission: "build:view",
    isLoading: projectsLoading,
    isError: projectsError,
    error: projectsRawError,
  });

  const isReady = pageState.kind === "ready";

  return (
    <>
      <PageWrapper
        title="Command Center"
        subtitle={isReady ? "Your issues, projects, and shortcuts" : undefined}
        contentClassName="pb-0 sm:pb-0"
        actions={
          isReady ? (
            <QuickCreateMenu
              projects={projects}
              onCreateProject={handleOpenWizard}
              onCreateForProject={handleCreateForProject}
              onCreateIssue={handleCreateIssueShortcut}
            />
          ) : undefined
        }
      >
        <PageState
          resolution={pageState}
          loading={<CommandCenterLoading />}
          onRetry={handleRetry}
          className="flex-1"
        >
          <PmPageShell className={COMMAND_CENTER_PAGE_SHELL}>
            <PmSection index={0} className="min-w-0 w-full max-w-full">
              <StatCardGrid cols={3}>
                <motion.div
                  whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                  transition={pmSnappy}
                >
                  <StatCard label="Projects" value={stats.activeProjects} icon={Briefcase} tone="default" index={0} href="/build" />
                </motion.div>
                <motion.div
                  whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                  transition={pmSnappy}
                >
                  <StatCard label="Open issues" value={stats.openIssues} icon={CheckSquare} tone="default" index={1} href="/build/my-work" />
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
                  <StatCard label="Overdue" value={stats.overdueIssues} icon={AlertCircle} tone={stats.overdueIssues > 0 ? "red" : "default"} index={2} href="/build/my-work" />
                </motion.div>
              </StatCardGrid>
            </PmSection>

            <PmSection index={1} className="min-w-0 w-full max-w-full overflow-hidden">
              <PmPanel className={COMMAND_CENTER_JUMP_PANEL}>
                <p className="mb-1.5 px-0.5 text-micro font-medium uppercase tracking-wider text-muted-foreground">
                  Jump to
                </p>
                <PinnedNav defaultProjectId={projects[0]?.id ?? null} />
              </PmPanel>
            </PmSection>

            <div className={COMMAND_CENTER_PANELS_GRID}>
              <MyIssuesPanel
                items={myWorkItems}
                projects={projects}
                isLoading={myIssuesLoading}
                isError={myIssuesError}
                error={myIssuesRawError}
                isFetchingNextPage={isFetchingNextPage}
                emptyActions={myIssuesEmpty}
                onRetry={handleMyIssuesRetry}
                onScroll={handleMyIssuesScroll}
                onCreateIssue={handleCreateIssueShortcut}
                onCreateForProject={handleCreateForProject}
              />
              <ProjectsPanel
                projects={projects}
                canCreateProject={canCreateProject}
                canCreateIssue={canCreateIssue}
                onCreateProject={handleOpenWizard}
                onCreateForProject={handleCreateForProject}
              />
            </div>

            <motion.p
              className="hidden min-w-0 w-full max-w-full text-center text-micro text-muted-foreground md:block"
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
        </PageState>
      </PageWrapper>

      {isReady && <ProjectCreateWizard open={wizardOpen} onOpenChange={setWizardOpen} />}
    </>
  );
}
