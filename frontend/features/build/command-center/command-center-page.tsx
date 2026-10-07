"use client";

import { useMemo, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useCommandPalette } from "@/components/command-palette/hooks/use-command-palette";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { QuickCreateMenu } from "./command-center-actions";
import { PmPageShell, PmSection } from "@/components/pm-chrome";
import { pmSnappy } from "@/lib/motion-presets";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { CommandCenterToolbar } from "./command-center-toolbar";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { resolveMyIssuesEmptyActions } from "./command-center-utils";
import { COMMAND_CENTER_PAGE_SHELL } from "./command-center-constants";
import { useDashboardLayoutEditor } from "./use-dashboard-layout";
import { CommandCenterLayoutControls } from "./command-center-layout-controls";
import { CommandCenterLoading } from "./command-center-loading";
import { useCommandCenterData } from "./use-command-center-data";
import { useCommandCenterWidgets } from "./use-command-center-widgets";
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
  const [editing, setEditing] = useState(false);
  const { openCreateTicket } = useCommandPalette();
  const canCreateIssue = useCan("build:tickets:create");
  const canCreateProject = useCan("build:create");
  const canViewTickets = useCan("build:tickets:view");
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

  const layout = useDashboardLayoutEditor();
  const isEditing = editing && layout.canCustomize;
  const placedTypes = useMemo(() => new Set(layout.widgets.map((slot) => slot.type)), [layout.widgets]);
  const handleStartCustomizing = useCallback(() => setEditing(true), []);
  const customizeAction = useMemo(
    () => (layout.canCustomize ? { label: "Customize", onClick: handleStartCustomizing } : undefined),
    [layout.canCustomize, handleStartCustomizing],
  );

  const widgetContent = useCommandCenterWidgets({
    stats,
    myWorkItems,
    projects,
    myIssuesLoading,
    myIssuesError,
    myIssuesRawError,
    isFetchingNextPage,
    myIssuesEmpty,
    focusedIndex,
    canCreateIssue,
    canCreateProject,
    projectsError,
    projectsRawError,
    onMyIssuesRetry: handleMyIssuesRetry,
    onMyIssuesScroll: handleMyIssuesScroll,
    onCreateIssue: handleCreateIssueShortcut,
    onCreateForProject: handleCreateForProject,
    onCreateProject: handleOpenWizard,
    onRetryProjects: refetchProjects,
  });

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
              <CommandCenterToolbar />
            </PmSection>

            {layout.canCustomize ? (
              <div className="flex min-w-0 w-full max-w-full items-center justify-end">
                <CommandCenterLayoutControls
                  editing={isEditing}
                  onEditingChange={setEditing}
                  onReset={layout.resetLayout}
                  availableTypes={layout.availableTypes}
                  placedTypes={placedTypes}
                  onAdd={layout.addWidget}
                />
              </div>
            ) : null}

            {layout.widgets.length === 0 ? (
              layout.isLoading ? (
                <Skeleton className="h-96 w-full rounded-xl" />
              ) : (
                <EmptyState
                  title="Your Command Center is empty"
                  description={
                    layout.canCustomize
                      ? "Add widgets to see your issues, projects and approvals here."
                      : "There are no widgets you can view yet."
                  }
                  action={customizeAction}
                />
              )
            ) : (
              <CommandCenterWidgetGrid
                widgets={layout.widgets}
                content={widgetContent}
                editing={isEditing}
                onLayoutChange={layout.applyLayout}
                onRemove={layout.removeWidget}
                onResize={layout.resizeWidget}
                onMove={layout.moveWidget}
              />
            )}

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
