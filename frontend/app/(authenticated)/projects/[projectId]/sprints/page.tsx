"use client";

import { use, useState, useCallback } from "react";
import {
  useSprints, useProject, useUpdateSprint, useUpdateTicket,
} from "@/hooks/api/projects";
import { CreateSprintDialog } from "@/features/projects/sprints/create-sprint-dialog";
import { BurndownChart } from "@/features/projects/sprints/burndown-chart";
import { VelocityChart } from "@/features/projects/sprints/velocity-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptySprintIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { DropResult } from "@hello-pangea/dnd";
import { SprintCard } from "@/features/projects/sprints/sprint-card";
import { CompleteSprintSheet } from "@/features/projects/sprints/complete-sprint-sheet";
import { SprintPlanningPanel } from "@/features/projects/sprints/sprint-planning-panel";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function SprintsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const { data: sprints, isLoading } = useSprints(projectId);
  const { data: project } = useProject(projectId);

  const [planningSprintId, setPlanningSprintId] = useState<number | null>(null);
  const [completionSprintId, setCompletionSprintId] = useState<number | null>(null);
  const [moveToOption, setMoveToOption] = useState<string>("backlog");

  const updateSprint = useUpdateSprint(projectId);
  const updateTicket = useUpdateTicket(projectId);

  const handleStartSprint = useCallback((sprintId: number) => {
    updateSprint.mutate(
      { sprintId, status: "ACTIVE" },
      {
        onSuccess: () => toast.success("Sprint started"),
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [updateSprint]);

  const handleOpenCompletionSheet = useCallback((sprintId: number) => {
    setCompletionSprintId(sprintId);
  }, []);

  const handleOpenPlanningSheet = useCallback((sprintId: number) => {
    setPlanningSprintId(sprintId);
  }, []);

  const handleClosePlanningSheet = useCallback(() => {
    setPlanningSprintId(null);
  }, []);

  const handleCancelCompletion = useCallback(() => {
    setCompletionSprintId(null);
  }, []);

  const handleConfirmCompletion = useCallback(() => {
    if (!completionSprintId) return;
    const sprint = sprints?.find((s) => s.id === completionSprintId);
    if (!sprint) return;

    const incompleteTickets = (sprint.tickets || []).filter((t) => t.status !== "DONE");
    const nextSprint = sprints?.find((s) => s.status === "PLANNED");
    const targetSprintId = moveToOption === "next" && nextSprint ? nextSprint.id : undefined;

    const promises = incompleteTickets.map((ticket) =>
      updateTicket.mutateAsync({ ticketId: ticket.id, sprintId: targetSprintId })
    );

    Promise.all(promises)
      .then(() => {
        updateSprint.mutate(
          { sprintId: completionSprintId, status: "COMPLETED" },
          {
            onSuccess: () => toast.success("Sprint completed"),
            onError: (error) => toast.error(getErrorMessage(error)),
          }
        );
        setCompletionSprintId(null);
      })
      .catch(() => {
        toast.error("Failed to move some tickets");
      });
  }, [completionSprintId, sprints, moveToOption, updateTicket, updateSprint]);

  const handlePlanningDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const ticketId = parseInt(draggableId);
    const newSprintId = destination.droppableId === "backlog" ? undefined : parseInt(destination.droppableId);

    updateTicket.mutate(
      { ticketId, ...(newSprintId !== undefined ? { sprintId: newSprintId } : {}) },
      { onError: (error) => toast.error(getErrorMessage(error)) }
    );
  }, [updateTicket]);

  if (isLoading) {
    return (
      <PageWrapper title="Sprints" backHref={`/projects/${projectId}`} actions={<CreateSprintDialog projectId={projectId} />}>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <div className="border-t border-border" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  const activeSprints = sprints?.filter((s) => s.status === "ACTIVE") || [];
  const plannedSprints = sprints?.filter((s) => s.status === "PLANNED") || [];
  const completedSprints = sprints?.filter((s) => s.status === "COMPLETED") || [];

  const allTickets = project?.tickets || [];
  const backlogTickets = allTickets.filter((t) => !t.sprintId && t.type !== "EPIC");

  const planningSprint = planningSprintId ? sprints?.find((s) => s.id === planningSprintId) : null;
  const completionSprint = completionSprintId ? sprints?.find((s) => s.id === completionSprintId) : null;
  const nextPlannedSprint = sprints?.find((s) => s.status === "PLANNED");

  const subtitleParts: string[] = [];
  if (activeSprints.length > 0) subtitleParts.push(`${activeSprints.length} active`);
  if (plannedSprints.length > 0) subtitleParts.push(`${plannedSprints.length} planned`);
  if (completedSprints.length > 0) subtitleParts.push(`${completedSprints.length} completed`);
  const subtitle = subtitleParts.length > 0
    ? subtitleParts.join(", ")
    : "Create your first sprint to start organizing work";

  const hasSections = activeSprints.length > 0 || plannedSprints.length > 0 || completedSprints.length > 0;

  return (
    <PageWrapper
      title="Sprints"
      subtitle={subtitle}
      backHref={`/projects/${projectId}`}
      actions={<CreateSprintDialog projectId={projectId} />}
    >
      {planningSprintId && planningSprint && (
        <SprintPlanningPanel
          sprint={planningSprint}
          backlogTickets={backlogTickets}
          onDragEnd={handlePlanningDragEnd}
          onDone={handleClosePlanningSheet}
        />
      )}

      {hasSections && (
        <div className="space-y-6">
          {activeSprints.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Active
              </p>
              <div className="grid gap-3">
                {activeSprints.map((sprint) => (
                  <div key={sprint.id} className="space-y-3">
                    <SprintCard
                      sprint={sprint}
                      projectId={projectId}
                      onComplete={handleOpenCompletionSheet}
                      onPlan={handleOpenPlanningSheet}
                      isUpdating={updateSprint.isPending}
                    />
                    <BurndownChart sprintId={sprint.id} projectId={projectId} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSprints.length > 0 && plannedSprints.length > 0 && (
            <div className="border-t border-border" />
          )}

          {plannedSprints.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Planned
              </p>
              <div className="grid gap-3">
                {plannedSprints.map((sprint) => (
                  <SprintCard
                    key={sprint.id}
                    sprint={sprint}
                    projectId={projectId}
                    onStart={handleStartSprint}
                    onPlan={handleOpenPlanningSheet}
                    isUpdating={updateSprint.isPending}
                  />
                ))}
              </div>
            </section>
          )}

          {completedSprints.length > 0 && (
            <>
              <div className="border-t border-border" />
              <VelocityChart sprints={completedSprints} />
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Completed
                </p>
                <div className="grid gap-3">
                  {completedSprints.map((sprint) => (
                    <SprintCard
                      key={sprint.id}
                      sprint={sprint}
                      projectId={projectId}
                      isUpdating={updateSprint.isPending}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {sprints?.length === 0 && (
        <EmptyState
          illustration={<EmptySprintIllustration />}
          title="No sprints yet"
          description="Create your first sprint to start organizing your work."
          className="min-h-[40vh]"
        />
      )}

      <CompleteSprintSheet
        sprint={completionSprint ?? null}
        nextPlannedSprint={nextPlannedSprint}
        moveToOption={moveToOption}
        isUpdating={updateSprint.isPending}
        onMoveToChange={setMoveToOption}
        onCancel={handleCancelCompletion}
        onConfirm={handleConfirmCompletion}
      />
    </PageWrapper>
  );
}
