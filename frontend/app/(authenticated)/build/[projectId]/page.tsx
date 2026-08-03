"use client";

import { use, useCallback } from "react";
import { useProject, useSprints, useBulkUpdateTickets } from "@/hooks/api";
import type { BulkUpdateTicketsInput } from "@/hooks/api";
import { useBoardUrlState } from "@/features/build/views/use-board-url-state";
import { ProjectBoardContent } from "@/features/build/views/project-board-content";
import { ProjectViewsToolbar } from "@/features/build/views/project-views-toolbar";
import { CreateTicketDialog } from "@/features/build/tickets/create-ticket-dialog";
import { ProjectAiMenu } from "@/features/build/ai/project-ai-menu";
import { SaveViewDialog } from "@/features/build/views/save-view-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectBoardPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading: projectLoading } = useProject(projectId);
  const { data: sprints } = useSprints(projectId);
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const {
    view,
    displayOptions,
    setDisplayOptions,
    hideCompleted,
    setHideCompleted,
    workloadFilters,
    saveViewOpen,
    setSaveViewOpen,
    saveViewName,
    createView,
    selectedIds,
    ticketsLoading,
    filteredTickets,
    statuses,
    members,
    wipLimits,
    doneCount,
    showEmptyFilterState,
    activeView,
    createParamOpen,
    createDefaultCycleId,
    handleViewChange,
    handleClearSearch,
    handleClearView,
    handleCreateOpenChange,
    handleOpenSaveView,
    handleSaveViewNameChange,
    handleSaveView,
    handleWorkloadFilterChange,
    handleClearWorkloadFilters,
    handleTicketSelect,
    handleSelectionChange,
    handleClearSelection,
  } = useBoardUrlState(projectId);

  const isLoading = projectLoading || ticketsLoading;

  const handleBulkUpdate = useCallback(
    (
      update: Partial<
        Pick<
          BulkUpdateTicketsInput,
          "assigneeId" | "status" | "sprintId" | "priority" | "parentTicketId"
        >
      >,
    ) => {
      if (selectedIds.size === 0) {
        toast.error("No tickets selected");
        return;
      }
      bulkUpdate.mutate(
        { ticketIds: [...selectedIds].map(Number), ...update },
        {
          onSuccess: (d) => {
            toast.success(`${d.updated} ticket${d.updated !== 1 ? "s" : ""} updated`);
            handleClearSelection();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [selectedIds, bulkUpdate, handleClearSelection],
  );

  const handleBulkStatus = useCallback(
    (v: string) => handleBulkUpdate({ status: v }),
    [handleBulkUpdate],
  );
  const handleBulkPriority = useCallback(
    (v: string) => {
      if (v === "LOW" || v === "MEDIUM" || v === "HIGH" || v === "URGENT") {
        handleBulkUpdate({ priority: v });
      }
    },
    [handleBulkUpdate],
  );
  const handleBulkAssignee = useCallback(
    (v: string) => handleBulkUpdate({ assigneeId: v }),
    [handleBulkUpdate],
  );
  const handleBulkSprint = useCallback(
    (v: string) => handleBulkUpdate({ sprintId: v === "backlog" ? null : Number(v) }),
    [handleBulkUpdate],
  );
  const handleBulkParent = useCallback(
    (parentTicketId: number | null) => handleBulkUpdate({ parentTicketId }),
    [handleBulkUpdate],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Loading..." noInternalScroll>
        <KanbanBoardSkeleton />
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title={data.name}
      subtitle={data.description ?? undefined}
      noInternalScroll
      filtersClassName="!gap-1 !px-3 sm:!gap-1.5 sm:!px-4 lg:!px-6"
      contentClassName="!p-0 flex flex-col"
      className="relative"
      actions={
        <div className="flex items-center gap-2">
          <ProjectAiMenu projectId={projectId} />
          <CreateTicketDialog
            projectId={projectId}
            defaultCycleId={createDefaultCycleId}
            externalOpen={createParamOpen}
            onExternalOpenChange={handleCreateOpenChange}
          />
        </div>
      }
      filters={
        <ProjectViewsToolbar
          view={view}
          onViewChange={handleViewChange}
          displayOptions={displayOptions}
          onDisplayOptionsChange={setDisplayOptions}
          activeViewName={activeView?.name ?? null}
          onClearView={handleClearView}
          onOpenSaveView={handleOpenSaveView}
          projectId={projectId}
          members={members}
          statuses={statuses}
          hideCompleted={hideCompleted}
          onHideCompletedChange={setHideCompleted}
          doneCount={doneCount}
          workloadFilters={workloadFilters}
          onWorkloadFilterChange={handleWorkloadFilterChange}
          onClearWorkloadFilters={handleClearWorkloadFilters}
        />
      }
    >
      <ProjectBoardContent
        view={view}
        filteredTickets={filteredTickets}
        showEmptyFilterState={showEmptyFilterState}
        onClearSearch={handleClearSearch}
        projectId={projectId}
        projectKey={data.key}
        statuses={statuses}
        wipLimits={wipLimits}
        members={members}
        displayOptions={displayOptions}
        hideCompleted={hideCompleted}
        workloadFilters={workloadFilters}
        onTicketSelect={handleTicketSelect}
        onWorkloadFilterChange={handleWorkloadFilterChange}
        sprints={sprints ?? []}
        selectedIds={selectedIds}
        onBulkStatus={handleBulkStatus}
        onBulkPriority={handleBulkPriority}
        onBulkAssignee={handleBulkAssignee}
        onBulkSprint={handleBulkSprint}
        onBulkParent={handleBulkParent}
        onClearSelection={handleClearSelection}
        onSelectionChange={handleSelectionChange}
      />
      <SaveViewDialog
        open={saveViewOpen}
        onOpenChange={setSaveViewOpen}
        viewName={saveViewName}
        onViewNameChange={handleSaveViewNameChange}
        onSave={handleSaveView}
        onSaveWithMeta={handleSaveView}
        displayOptions={{ ...displayOptions }}
        isSaving={createView.isPending}
        activeLayout={view}
      />
    </PageWrapper>
  );
}
