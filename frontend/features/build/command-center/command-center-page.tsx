"use client";

import {
  useMemo,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Briefcase, CheckSquare, AlertCircle, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { useCan } from "@/hooks/api/access";
import { useProjects } from "@/hooks/api/build/projects";
import {
  COMMAND_CENTER_MY_ISSUES_FILTERS,
  useAllWork,
  useInfiniteAllWork,
} from "@/hooks/api/build/all-work";
import type { MyWorkItem } from "@/types/projects/my-work";
import { useCommandPalette } from "@/features/command-palette/hooks/use-command-palette";
import { ProjectCreateWizard } from "@/features/build/project-create/project-create-wizard";
import {
  CreateIssueButton,
  PinnedNav,
  QuickCreateMenu,
} from "./command-center-actions";
import { MyWorkRow, ProjectCard } from "./command-center-rows";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PmStaggerList,
  PM_PANEL,
} from "@/features/build/shared/pm-chrome";
import { pmSnappy } from "@/features/build/shared/pm-motion";
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
        router.push("/build/my-work");
        return;
      }

      if (pendingKey === "g" && e.key === "p") {
        setPendingKey(null);
        router.push("/build/all");
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
      secondaryAction: { label: "View all", href: "/build/my-work" },
    };
  }
  if (canCreateProject) {
    return {
      action: { label: "New project", onClick: onCreateProject },
      secondaryAction: hasProjects
        ? { label: "View all", href: "/build/my-work" }
        : { label: "All projects", href: "/build/all" },
    };
  }
  if (hasProjects) {
    return { action: { label: "View all", href: "/build/my-work" } };
  }
  return { action: { label: "All projects", href: "/build/all" } };
}

function PanelHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 min-w-0 items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
      <h2 className="min-w-0 truncate text-xs font-semibold tracking-wide text-foreground">
        {title}
      </h2>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      ) : null}
    </div>
  );
}

const MY_ISSUES_LOAD_MORE_THRESHOLD = 120;

const COMMAND_CENTER_LIST_PANEL_HEIGHT =
  "max-h-[min(50dvh,24rem)] lg:h-[min(380px,calc(100dvh-24rem))]";

const COMMAND_CENTER_LIST_PANEL = cn(
  "flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden",
  COMMAND_CENTER_LIST_PANEL_HEIGHT,
);

const COMMAND_CENTER_PANEL_BODY_SCROLL = "min-h-0 min-w-0 max-w-full flex-1";

const COMMAND_CENTER_PAGE_SHELL =
  "flex-none min-h-min min-w-0 w-full max-w-full overflow-x-hidden overflow-y-visible";

const COMMAND_CENTER_JUMP_PANEL =
  "flex min-w-0 w-full max-w-full flex-col overflow-hidden p-2.5";

const COMMAND_CENTER_PANELS_GRID =
  "grid min-w-0 w-full max-w-full gap-4 lg:grid-cols-5 lg:items-stretch";

function mapAllWorkTicketToMyWorkItem(ticket: {
  id: number;
  projectId: number;
  projectName: string;
  projectKey: string;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string | null;
  type: string;
  dueDate: string | null;
}): MyWorkItem {
  return {
    id: ticket.id,
    projectId: ticket.projectId,
    projectName: ticket.projectName,
    projectKey: ticket.projectKey,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    type: ticket.type,
    dueDate: ticket.dueDate,
  };
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
    refetch: refetchProjects,
  } = useProjects({ status: "ACTIVE" });

  const {
    data: myIssuesPages,
    isLoading: myIssuesLoading,
    isError: myIssuesError,
    refetch: refetchMyIssues,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAllWork(COMMAND_CENTER_MY_ISSUES_FILTERS, {
    enabled: canViewTickets,
  });

  const { data: openIssuesSummary } = useAllWork(
    { ...COMMAND_CENTER_MY_ISSUES_FILTERS, limit: 1, page: 1 },
    { enabled: canViewTickets },
  );

  const { data: overdueIssuesSummary } = useAllWork(
    {
      ...COMMAND_CENTER_MY_ISSUES_FILTERS,
      limit: 1,
      page: 1,
      dueDateTo: overdueDueDateTo,
    },
    { enabled: canViewTickets },
  );

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
    void refetchMyIssues();
  }, [refetchProjects, refetchMyIssues]);

  const myWorkItems = useMemo(() => {
    if (!myIssuesPages?.pages) return [];
    return myIssuesPages.pages.flatMap((page) =>
      page.data.map(mapAllWorkTicketToMyWorkItem),
    );
  }, [myIssuesPages]);

  const stats = useMemo(() => {
    const projectList = projectsData?.data ?? [];
    return {
      activeProjects: projectList.length,
      openIssues: openIssuesSummary?.total ?? 0,
      overdueIssues: overdueIssuesSummary?.total ?? 0,
    };
  }, [projectsData, openIssuesSummary, overdueIssuesSummary]);

  const handleMyIssuesScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      if (
        distanceFromBottom <= MY_ISSUES_LOAD_MORE_THRESHOLD &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        void fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
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

  const isLoading = projectsLoading;
  const isError = projectsError;

  if (isLoading) {
    return (
      <PageWrapper title="Home" contentClassName="pb-0 sm:pb-0">
        <PmPageShell className={COMMAND_CENTER_PAGE_SHELL}>
          <div className="min-w-0 w-full max-w-full">
            <StatCardGridSkeleton cols={3} />
          </div>
          <Skeleton className={cn("h-56 rounded-xl", PM_PANEL)} />
          <Skeleton className={cn("h-48 rounded-xl", PM_PANEL)} />
          <div className="grid min-w-0 w-full max-w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className={cn("h-28 rounded-xl", PM_PANEL)} />
            ))}
          </div>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Home" contentClassName="pb-0 sm:pb-0">
        <PmPageShell withGlow={false} className={COMMAND_CENTER_PAGE_SHELL}>
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
        contentClassName="pb-0 sm:pb-0"
        actions={
          <QuickCreateMenu
            projects={projects}
            onCreateProject={handleOpenWizard}
            onCreateForProject={handleCreateForProject}
            onCreateIssue={handleCreateIssueShortcut}
          />
        }
      >
        <PmPageShell className={COMMAND_CENTER_PAGE_SHELL}>
          <PmSection index={0} className="min-w-0 w-full max-w-full">
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
                  href="/build/all"
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
                  tone="default"
                  index={1}
                  href="/build/my-work"
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
                  href="/build/my-work"
                />
              </motion.div>
            </StatCardGrid>
          </PmSection>

          <PmSection index={1} className="min-w-0 w-full max-w-full overflow-hidden">
            <PmPanel className={COMMAND_CENTER_JUMP_PANEL}>
              <p className="mb-1.5 px-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Jump to
              </p>
              <PinnedNav defaultProjectId={projects[0]?.id ?? null} />
            </PmPanel>
          </PmSection>

          <div className={COMMAND_CENTER_PANELS_GRID}>
            <PmSection index={2} className="flex min-h-0 min-w-0 w-full max-w-full flex-col lg:col-span-3">
              <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
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
                        className="gap-1 text-xs"
                        asChild
                      >
                        <Link href="/build/my-work">
                          View all <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </>
                  }
                />
                {myIssuesLoading ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-1 p-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 shrink-0 rounded-lg" />
                    ))}
                  </div>
                ) : myIssuesError ? (
                  <ErrorState
                    className="min-h-[12rem] flex-1"
                    title="Failed to load your issues"
                    description="Could not fetch tickets. Please try again."
                    onRetry={() => void refetchMyIssues()}
                  />
                ) : myWorkItems.length === 0 ? (
                  <EmptyState
                    illustrationPreset="projects"
                    title="Inbox zero"
                    description={
                      projects.length === 0
                        ? "Create a project to start tracking issues."
                        : "No open issues assigned to you. Create one or open the board."
                    }
                    className="min-h-[12rem] flex-1"
                    action={myIssuesEmpty.action}
                    secondaryAction={myIssuesEmpty.secondaryAction}
                  />
                ) : (
                  <ScrollArea
                    fill
                    hideScrollbar
                    className={COMMAND_CENTER_PANEL_BODY_SCROLL}
                    onViewportScroll={handleMyIssuesScroll}
                  >
                    <div className="min-w-0 w-full max-w-full overscroll-contain">
                      <PmStaggerList>
                        {myWorkItems.map((item) => (
                          <MyWorkRow key={item.id} item={item} />
                        ))}
                      </PmStaggerList>
                      {isFetchingNextPage ? (
                        <div className="flex justify-center py-3">
                          <Loader2
                            className="h-4 w-4 animate-spin text-muted-foreground"
                            aria-label="Loading more issues"
                          />
                        </div>
                      ) : null}
                    </div>
                  </ScrollArea>
                )}
              </PmPanel>
            </PmSection>

            <PmSection index={3} className="flex min-h-0 min-w-0 w-full max-w-full flex-col lg:col-span-2">
              <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
                <PanelHeader
                  title="Projects"
                  actions={
                    <>
                      {canCreateProject ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs text-muted-foreground"
                          onClick={handleOpenWizard}
                        >
                          New
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        asChild
                      >
                        <Link href="/build/all">
                          All <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </>
                  }
                />
                <ScrollArea fill hideScrollbar className={COMMAND_CENTER_PANEL_BODY_SCROLL}>
                  <div className="min-w-0 w-full max-w-full overscroll-contain p-1.5">
                    {projects.length === 0 ? (
                      <EmptyState
                        illustrationPreset="projects"
                        title="No projects yet"
                        description="Create a project to start shipping."
                        className="min-h-[12rem]"
                        action={
                          canCreateProject
                            ? { label: "New project", onClick: handleOpenWizard }
                            : { label: "All projects", href: "/build/all" }
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
                </ScrollArea>
              </PmPanel>
            </PmSection>
          </div>

          <motion.p
            className="hidden min-w-0 w-full max-w-full text-center text-[10px] text-muted-foreground/70 md:block"
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
