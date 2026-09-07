"use client";

import { useState, useCallback } from "react";
import {
  useSprints,
  useProject,
  useUpdateSprint,
  useUpdateTicket,
  useProjectBoardTickets,
} from "@/hooks/api/build";
import { CreateSprintDialog } from "@/features/build/sprints/create-sprint-dialog";
import { EmptySprintIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { DropResult } from "@hello-pangea/dnd";
import { CompleteSprintSheet } from "@/features/build/sprints/complete-sprint-sheet";
import { SprintSections } from "@/features/build/sprints/sprint-sections";
import { SprintsPageSkeleton } from "@/features/build/sprints/sprints-page-skeleton";
import { SprintPlanningPanel, type PlanningTicket } from "@/features/build/sprints/sprint-planning-panel";
import { useSprintTicketMover } from "@/features/build/sprints/use-sprint-ticket-mover";
import { ModuleDisabledState } from "@/features/build/shared/module-disabled-state";
import { PmPageShell, PM_FILL_PANEL } from "@/components/pm-chrome/pm-chrome";

interface ProjectSprintsPageProps {
  projectId: string;
}

export function ProjectSprintsPage({ projectId: projectIdStr }: ProjectSprintsPageProps) {
  const projectId = parseInt(projectIdStr);

  const {
    data: sprints,
    isLoading,
    isError,
    error,
    refetch,
  } = useSprints(projectId);
  const { data: project } = useProject(projectId);
  const { data: boardTickets } = useProjectBoardTickets(projectId);

  const [planningSprintId, setPlanningSprintId] = useState<number | null>(null);
  const [completionSprintId, setCompletionSprintId] = useState<number | null>(null);
  const [moveToOption, setMoveToOption] = useState<string>("backlog");

  const updateSprint = useUpdateSprint(projectId);
  const updateTicket = useUpdateTicket(projectId);
  const { moveTickets } = useSprintTicketMover(projectId);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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
    toast.success("Sprint planning saved");
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
    const targetSprintId = moveToOption === "next" && nextSprint ? nextSprint.id : null;

    moveTickets(incompleteTickets.map((ticket) => ticket.id), targetSprintId)
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
      .catch((error) => {
        toast.error(getErrorMessage(error));
      });
  }, [completionSprintId, sprints, moveToOption, moveTickets, updateSprint]);

  const handlePlanningDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const ticketId = parseInt(draggableId);
    const newSprintId = destination.droppableId === "backlog" ? undefined : parseInt(destination.droppableId);

    updateTicket.mutate(
      { ticketId, ...(newSprintId !== undefined ? { sprintId: newSprintId } : { sprintId: null }) },
      { onError: (error) => toast.error(getErrorMessage(error)) }
    );
  }, [updateTicket]);

  const handleAddTicket = useCallback((ticketId: number) => {
    if (!planningSprintId) return;
    updateTicket.mutate(
      { ticketId, sprintId: planningSprintId },
      { onError: (error) => toast.error(getErrorMessage(error)) }
    );
  }, [planningSprintId, updateTicket]);

  const handleRemoveTicket = useCallback((ticketId: number) => {
    updateTicket.mutate(
      { ticketId, sprintId: null },
      { onError: (error) => toast.error(getErrorMessage(error)) }
    );
  }, [updateTicket]);

  const handleBulkAdd = useCallback((ticketIds: number[]) => {
    if (!planningSprintId) return;
    moveTickets(ticketIds, planningSprintId)
      .then(() => toast.success(`${ticketIds.length} ticket${ticketIds.length !== 1 ? "s" : ""} added to sprint`))
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [planningSprintId, moveTickets]);

  const handleBulkRemove = useCallback((ticketIds: number[]) => {
    moveTickets(ticketIds, null)
      .then(() => toast.success(`${ticketIds.length} ticket${ticketIds.length !== 1 ? "s" : ""} removed from sprint`))
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [moveTickets]);

  if (project?.settings?.modules?.sprints === false) {
    return <ModuleDisabledState moduleName="Sprints" projectId={projectId} />;
  }

  if (isLoading) {
    return (
      <PageWrapper title="Sprints" actions={<CreateSprintDialog projectId={projectId} />}>
        <SprintsPageSkeleton />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Sprints" subtitle="Plan and track time-boxed iterations">
        <PmPageShell>
          <ErrorState
            className="flex-1"
            title="Couldn't load sprints"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  const activeSprints = sprints?.filter((s) => s.status === "ACTIVE") || [];
  const plannedSprints = sprints?.filter((s) => s.status === "PLANNED") || [];
  const completedSprints = sprints?.filter((s) => s.status === "COMPLETED") || [];

  const allTickets = boardTickets ?? [];
  const sprintTicketIds = new Set(
    (sprints ?? []).flatMap((s) => (s.tickets ?? []).map((t) => t.id)),
  );
  const backlogTickets: PlanningTicket[] = allTickets
    .filter((t) => !t.sprintId && t.type !== "EPIC" && !sprintTicketIds.has(t.id))
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      points: t.points,
      sprintId: t.sprintId ?? null,
      type: t.type,
      priority: t.priority,
      ticketNumber: t.ticketNumber,
      assigneeId: t.assigneeId,
      assignee: t.assignee ?? null,
    }));

  const planningSprint = planningSprintId ? sprints?.find((s) => s.id === planningSprintId) : null;
  const completionSprint = completionSprintId ? sprints?.find((s) => s.id === completionSprintId) : null;
  const nextPlannedSprint = sprints?.find((s) => s.status === "PLANNED");

  const hasSections = activeSprints.length > 0 || plannedSprints.length > 0 || completedSprints.length > 0;

  return (
    <PageWrapper
      title="Sprints"
      subtitle="Plan and track time-boxed iterations"
      actions={<CreateSprintDialog projectId={projectId} />}
    >
      <PmPageShell>
        {planningSprintId && planningSprint ? (
          <SprintPlanningPanel
            sprint={planningSprint}
            backlogTickets={backlogTickets}
            projectKey={project?.key ?? null}
            onDragEnd={handlePlanningDragEnd}
            onAddTicket={handleAddTicket}
            onRemoveTicket={handleRemoveTicket}
            onBulkAdd={handleBulkAdd}
            onBulkRemove={handleBulkRemove}
            onDone={handleClosePlanningSheet}
            isMutating={updateTicket.isPending}
            sprintCapacity={null}
          />
        ) : null}

        {hasSections ? (
          <SprintSections
            projectId={projectId}
            activeSprints={activeSprints}
            plannedSprints={plannedSprints}
            completedSprints={completedSprints}
            isUpdating={updateSprint.isPending}
            onStart={handleStartSprint}
            onComplete={handleOpenCompletionSheet}
            onPlan={handleOpenPlanningSheet}
          />
        ) : null}

        {sprints?.length === 0 ? (
          <EmptyState
              className={PM_FILL_PANEL}
              illustration={<EmptySprintIllustration />}
              title="No sprints yet"
              description="Create your first sprint to start organizing your work."
            />
        ) : null}

        <CompleteSprintSheet
          sprint={completionSprint ?? null}
          nextPlannedSprint={nextPlannedSprint}
          moveToOption={moveToOption}
          isUpdating={updateSprint.isPending}
          onMoveToChange={setMoveToOption}
          onCancel={handleCancelCompletion}
          onConfirm={handleConfirmCompletion}
        />
      </PmPageShell>
    </PageWrapper>
  );
}
