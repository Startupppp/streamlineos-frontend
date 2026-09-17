"use client";

import { useState } from "react";
import { SettingsIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { useFeedbucketWidgets } from "@/hooks/api/feedbucket";
import { useProject } from "@/hooks/api/build/projects";
import { CreateFeedbucketWidgetSheet } from "./create-feedbucket-widget-sheet";
import { WidgetSetupSheet } from "./widget-setup-sheet";
import { ProjectSubmissionsInbox } from "./project-submissions-inbox";

interface ProjectFeedbucketPageProps {
  projectId: number;
}

export function ProjectFeedbucketPage({ projectId }: ProjectFeedbucketPageProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const {
    data: widgets,
    isLoading: widgetsLoading,
    isError: widgetsError,
    error: widgetsErrorValue,
    refetch: refetchWidgets,
  } = useFeedbucketWidgets();
  const { data: project } = useProject(projectId);

  const projectWidget = widgets?.find((w) => w.projectId === projectId) ?? null;
  const defaultWidgetName = project?.name?.trim() ?? "";

  const pageState = usePageState({
    permission: "feedbucket:submissions:view",
    module: "feedbucket",
    isLoading: widgetsLoading,
    isError: widgetsError,
    error: widgetsErrorValue,
    isEmpty: projectWidget === null,
  });

  function handleRetryWidgets() {
    void refetchWidgets();
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleCloseCreate() {
    setCreateOpen(false);
  }

  function handleOpenSetup() {
    setSetupOpen(true);
  }

  function handleCloseSetup() {
    setSetupOpen(false);
  }

  const headerActions = projectWidget ? (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1.5" aria-live="polite">
        <Badge
          variant={projectWidget.isActive ? "default" : "outline"}
          className="text-xs"
        >
          {projectWidget.isActive ? "Active" : "Inactive"}
        </Badge>
        {projectWidget.aiAssistEnabled ? (
          <Badge variant="secondary" className="text-xs">
            AI assist
          </Badge>
        ) : null}
      </div>
      <AnimatedIconButton
        size="sm"
        variant="outline"
        icon={SettingsIcon}
        iconSize={14}
        iconClassName="mr-1.5"
        onClick={handleOpenSetup}
      >
        Widget setup
      </AnimatedIconButton>
    </div>
  ) : undefined;

  return (
    <PageWrapper
      title="Feedback"
      subtitle="Collect and triage user feedback submitted via this project's widget."
      actions={headerActions}
      state={pageState}
      onRetry={handleRetryWidgets}
      loading={
        <PmPageShell>
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </PmPageShell>
      }
    >
      <PmPageShell>
        {projectWidget ? (
          <PmSection index={0} className="flex flex-1 min-h-0 flex-col">
            <p className="mb-2 text-sm font-semibold text-foreground">Submissions</p>
            <PmPanel className="flex flex-1 min-h-0 h-full flex-col p-0" solid>
              <ProjectSubmissionsInbox
                widgetId={projectWidget.id}
                projectId={projectId}
              />
            </PmPanel>
          </PmSection>
        ) : (
          <EmptyState
            className={PM_FILL_PANEL}
            illustration={<EmptyTicketIllustration className="h-24 w-24" />}
            title="No feedback widget"
            description="Create a widget to embed on your product and start collecting feedback for this project."
            action={{ label: "Create feedback widget", onClick: handleOpenCreate }}
          />
        )}
      </PmPageShell>

      <CreateFeedbucketWidgetSheet
        open={createOpen}
        projectId={projectId}
        defaultName={defaultWidgetName}
        onClose={handleCloseCreate}
      />

      {projectWidget ? (
        <WidgetSetupSheet
          open={setupOpen}
          widget={projectWidget}
          onClose={handleCloseSetup}
        />
      ) : null}
    </PageWrapper>
  );
}
