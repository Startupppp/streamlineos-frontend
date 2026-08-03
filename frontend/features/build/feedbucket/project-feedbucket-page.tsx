"use client";

import { useState } from "react";
import { SettingsIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/build/shared/pm-chrome";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
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
    refetch: refetchWidgets,
  } = useFeedbucketWidgets();
  const { data: project } = useProject(projectId);

  const projectWidget = widgets?.find((w) => w.projectId === projectId) ?? null;
  const defaultWidgetName = project?.name?.trim() ?? "";

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
    <DashboardGate permission="feedbucket:submissions:view">
      <PageWrapper
        title="Feedback"
        subtitle="Collect and triage user feedback submitted via this project's widget."
        actions={headerActions}
      >
        <PmPageShell>
          {widgetsLoading ? (
            <div className="flex flex-1 min-h-0 flex-col gap-3">
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : widgetsError ? (
            <ErrorState description="Failed to load widget." onRetry={handleRetryWidgets} />
          ) : !projectWidget ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustration={<EmptyTicketIllustration className="h-24 w-24" />}
              title="No feedback widget"
              description="Create a widget to embed on your product and start collecting feedback for this project."
              action={{ label: "Create feedback widget", onClick: handleOpenCreate }}
            />
          ) : (
            <PmSection index={0} className="flex flex-1 min-h-0 flex-col">
              <p className="mb-2 text-sm font-semibold text-foreground">Submissions</p>
              <PmPanel className="flex flex-1 min-h-0 h-full flex-col p-0" solid>
                <ProjectSubmissionsInbox
                  widgetId={projectWidget.id}
                  projectId={projectId}
                />
              </PmPanel>
            </PmSection>
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
    </DashboardGate>
  );
}
