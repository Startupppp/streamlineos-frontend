"use client";

import { use, useState, useCallback } from "react";
import {
  useSprints,
  useProject,
  useUpdateSprint,
  useUpdateTicket,
  useProjectBoardTickets,
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
import { SprintPlanningPanel, type PlanningTicket } from "@/features/projects/sprints/sprint-planning-panel";
import { ModuleDisabledState } from "@/features/projects/shared/module-disabled-state";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
} from "@/features/projects/shared/pm-chrome";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function SprintsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const { data: sprints, isLoading } = useSprints(projectId);
  const { data: project } = useProject(projectId);
  const { data: boardTickets } = useProjectBoardTickets(projectId);

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
    const promises = ticketIds.map((ticketId) =>
      updateTicket.mutateAsync({ ticketId, sprintId: planningSprintId })
    );
    Promise.all(promises)
      .then(() => toast.success(`${ticketIds.length} ticket${ticketIds.length !== 1 ? "s" : ""} added to sprint`))
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [planningSprintId, updateTicket]);

  const handleBulkRemove = useCallback((ticketIds: number[]) => {
    const promises = ticketIds.map((ticketId) =>
      updateTicket.mutateAsync({ ticketId, sprintId: null })
    );
    Promise.all(promises)
      .then(() => toast.success(`${ticketIds.length} ticket${ticketIds.length !== 1 ? "s" : ""} removed from sprint`))
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [updateTicket]);

  if (project?.settings?.modules?.sprints === false) {
    return <ModuleDisabledState moduleName="Sprints" projectId={projectId} />;
  }

  if (isLoading) {
    return (
      <PageWrapper title="Sprints" subtitle="Loading..." actions={<CreateSprintDialog projectId={projectId} />}>
        <PmPageShell>
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
            <div className="border-t border-border/50" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
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
          <div className="space-y-5">
            {activeSprints.length > 0 ? (
              <PmSection index={0}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Active
                </p>
                <PmStaggerList className="grid gap-2.5">
                  {activeSprints.map((sprint) => (
                    <div key={sprint.id} className="space-y-2.5">
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
                </PmStaggerList>
              </PmSection>
            ) : null}

            {activeSprints.length > 0 && plannedSprints.length > 0 ? (
              <div className="border-t border-border/50" />
            ) : null}

            {plannedSprints.length > 0 ? (
              <PmSection index={1}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Planned
                </p>
                <PmStaggerList className="grid gap-2.5">
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
                </PmStaggerList>
              </PmSection>
            ) : null}

            {completedSprints.length > 0 ? (
              <>
                <div className="border-t border-border/50" />
                <PmSection index={2}>
                  <VelocityChart sprints={completedSprints} />
                </PmSection>
                <PmSection index={3}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Completed
                  </p>
                  <PmStaggerList className="grid gap-2.5">
                    {completedSprints.map((sprint) => (
                      <SprintCard
                        key={sprint.id}
                        sprint={sprint}
                        projectId={projectId}
                        isUpdating={updateSprint.isPending}
                      />
                    ))}
                  </PmStaggerList>
                </PmSection>
              </>
            ) : null}
          </div>
        ) : null}

        {sprints?.length === 0 ? (
          <EmptyState
            illustration={<EmptySprintIllustration />}
            title="No sprints yet"
            description="Create your first sprint to start organizing your work."
            className="min-h-[40vh]"
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
