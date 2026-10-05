"use client";

import React, { useMemo, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Briefcase, CheckSquare, AlertCircle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useCommandPalette } from "@/components/command-palette/hooks/use-command-palette";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { QuickCreateMenu } from "./command-center-actions";
import { PinnedNav } from "./command-center-pinned-nav";
import {
  PmPageShell,
  PmSection,
  PmPanel,
} from "@/components/pm-chrome";
import { pmSnappy } from "@/lib/motion-presets";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { CommandCenterToolbar } from "./command-center-toolbar";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { resolveMyIssuesEmptyActions } from "./command-center-utils";
import {
  COMMAND_CENTER_PAGE_SHELL,
  COMMAND_CENTER_JUMP_PANEL,
} from "./command-center-constants";
import { useDashboardLayoutEditor } from "./use-dashboard-layout";
import { LayoutResetButton } from "./command-center-layout-manager";
import { toast } from "sonner";
import type { WidgetType } from "./dashboard-layout";
import { CommandCenterLoading } from "./command-center-loading";
import { useCommandCenterData } from "./use-command-center-data";
import { CommandCenterWidgetGrid } from "./command-center-widget-grid";

const ProjectCreateWizard = dynamic(
  () =>
    import("@/features/build/project-create/project-create-wizard").then(
      (m) => m.ProjectCreateWizard,
    ),
  { ssr: false },
);

export function CommandCenterPage() {
  const router = useRouter();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const { openCreateTicket } = useCommandPalette();
  const canCreateIssue = useCan("build:tickets:create");
  const canCreateProject = useCan("build:create");
  const canViewTickets = useCan("build:tickets:view");
  const canViewApprovals = useCan("build:approvals:view");
  const canViewRisks = useCan("build:risks:view");
  const shouldReduceMotion = useReducedMotion();
  const isOnline = useOnlineStatus();

  const {
    projects,
    myWorkItems,
    stats,
    projectsLoading,
    projectsError,
    projectsRawError,
    myIssuesLoading,
    myIssuesError,
    myIssuesRawError,
    isFetchingNextPage,
    refetchProjects,
    handleRetryAll,
    handleMyIssuesRetry,
    handleMyIssuesScroll,
  } = useCommandCenterData(canViewTickets);

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

  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  useKeyboardShortcuts(handleOpenWizard, handleCreateIssueShortcut, handleShortcutHelp);

  const handleOpenItem = useCallback(
    (index: number) => {
      const item = myWorkItems[index];
      if (!item) return;
      router.push(getTicketDetailHref(item.projectId, item.projectKey, item.ticketNumber));
    },
    [myWorkItems, router],
  );

  const handleClearMyIssuesSelection = useCallback(() => {}, []);

  const { focusedIndex } = useBuildListKeyboard({
    itemCount: myWorkItems.length,
    onOpen: handleOpenItem,
    onClearSelection: handleClearMyIssuesSelection,
    onShortcutHelp: handleShortcutHelp,
  });

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

  const pageState = usePageState({
    permission: "build:view",
    isLoading: projectsLoading,
    isError: projectsError,
    error: projectsRawError,
  });

  const isReady = pageState.kind === "ready";

  const handleLayoutConflict = useCallback(() => {
    toast.error("Layout conflict — refreshed to latest version.");
  }, []);

  const { config, reorder: reorderWidget, removeWidget, resetToDefault } =
    useDashboardLayoutEditor(handleLayoutConflict);

  const handleResetLayout = useCallback(() => { resetToDefault("member"); }, [resetToDefault]);

  const orderedWidgetTypes = useMemo((): WidgetType[] => {
    if (config.widgets.length === 0) {
      return ["my-issues", "projects", "approvals", "agent-runs", "risks", "releases", "blockers"];
    }
    return config.widgets.map((w) => w.type);
  }, [config.widgets]);

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
          onRetry={handleRetryAll}
          className="flex-1"
        >
          <PmPageShell className={COMMAND_CENTER_PAGE_SHELL}>
            {!isOnline && (
              <p className="text-sm text-muted-foreground px-4 py-2 bg-muted/50 rounded-md mb-2">
                You are offline — content may not be up to date
              </p>
            )}
            <PmSection index={0} className="min-w-0 w-full max-w-full">
              <StatCardGrid cols={3}>
                <motion.div whileHover={shouldReduceMotion ? undefined : { y: -2 }} transition={pmSnappy}>
                  <StatCard label="Projects" value={stats.activeProjects} icon={Briefcase} tone="default" index={0} href="/build/projects" />
                </motion.div>
                <motion.div whileHover={shouldReduceMotion ? undefined : { y: -2 }} transition={pmSnappy}>
                  <StatCard label="Open issues" value={stats.openIssues} icon={CheckSquare} tone="default" index={1} href="/build/my-work" />
                </motion.div>
                <motion.div
                  whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                  transition={pmSnappy}
                  animate={stats.overdueIssues > 0 && !shouldReduceMotion ? { scale: [1, 1.015, 1] } : undefined}
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

            <PmSection index={2} className="min-w-0 w-full max-w-full">
              <CommandCenterToolbar />
            </PmSection>

            <div className="flex min-w-0 w-full max-w-full items-center justify-end">
              <LayoutResetButton onReset={handleResetLayout} />
            </div>

            <CommandCenterWidgetGrid
              orderedWidgetTypes={orderedWidgetTypes}
              myWorkItems={myWorkItems}
              projects={projects}
              myIssuesLoading={myIssuesLoading}
              myIssuesError={myIssuesError}
              myIssuesRawError={myIssuesRawError}
              isFetchingNextPage={isFetchingNextPage}
              myIssuesEmpty={myIssuesEmpty}
              focusedIndex={focusedIndex}
              canCreateIssue={canCreateIssue}
              canCreateProject={canCreateProject}
              canViewApprovals={canViewApprovals}
              canViewRisks={canViewRisks}
              canViewTickets={canViewTickets}
              projectsError={projectsError}
              projectsRawError={projectsRawError}
              onMyIssuesRetry={handleMyIssuesRetry}
              onMyIssuesScroll={handleMyIssuesScroll}
              onCreateIssue={handleCreateIssueShortcut}
              onCreateForProject={handleCreateForProject}
              onCreateProject={handleOpenWizard}
              onRetryProjects={() => void refetchProjects()}
              onReorderWidget={reorderWidget}
              onRemoveWidget={removeWidget}
            />

            <motion.p
              className="hidden min-w-0 w-full max-w-full text-center text-micro text-muted-foreground md:block"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...pmSnappy, delay: 0.28 }}
            >
              Shortcuts ·{" "}
              <kbd className="rounded border border-border bg-muted/80 px-1">C</kbd>
              <kbd className="ml-0.5 rounded border border-border bg-muted/80 px-1">P</kbd>{" "}
              project ·{" "}
              <kbd className="rounded border border-border bg-muted/80 px-1">C</kbd>
              <kbd className="ml-0.5 rounded border border-border bg-muted/80 px-1">T</kbd>{" "}
              issue ·{" "}
              <kbd className="rounded border border-border bg-muted/80 px-1">G</kbd>
              <kbd className="ml-0.5 rounded border border-border bg-muted/80 px-1">M</kbd>{" "}
              my issues ·{" "}
              <kbd className="rounded border border-border bg-muted/80 px-1">G</kbd>
              <kbd className="ml-0.5 rounded border border-border bg-muted/80 px-1">P</kbd>{" "}
              projects
            </motion.p>
          </PmPageShell>
        </PageState>
      </PageWrapper>

      {isReady && (
        <ProjectCreateWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      )}
      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </>
  );
}
