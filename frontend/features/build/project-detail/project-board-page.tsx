"use client";

import { use, useCallback, useMemo } from "react";
import { format, addDays } from "date-fns";
import { useProject, useSprints, useBulkUpdateTickets } from "@/hooks/api";
import { useWorkloadCapacity } from "@/hooks/api/build/workload-capacity";
import type { BulkUpdateTicketsInput } from "@/hooks/api";
import { useBoardUrlState } from "@/features/build/views/use-board-url-state";
import { ProjectBoardContent } from "@/features/build/views/project-board-content";
import { ProjectViewsToolbar } from "@/features/build/views/project-views-toolbar";
import { CreateTicketDialog } from "@/features/build/tickets/create-ticket-dialog";
import { ProjectAiMenu } from "@/features/build/ai/project-ai-menu";
import { SaveViewDialog } from "@/features/build/views/save-view-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectLoadFallback } from "@/features/build/shared/project-load-fallback";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { notFound } from "next/navigation";
import type { ViewType } from "@/features/build/views/view-switcher";

interface PageProps {
  params: Promise<{ projectId: string }>;
  defaultView?: ViewType;
}

export function ProjectBoardPage({ params, defaultView }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const {
    data,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorValue,
    refetch: refetchProject,
  } = useProject(projectId);
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
    updateView,
    selectedIds,
    ticketsLoading,
    ticketsError,
    ticketsErrorValue,
    refetchTickets,
    isTruncated,
    fetchMoreTickets,
    isFetchingMoreTickets,
    filteredTickets,
    statuses,
    members,
    wipLimits,
    doneCount,
    showEmptyFilterState,
    hasActiveFilters,
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
    handleUpdateActiveView,
    handleWorkloadFilterChange,
    handleClearWorkloadFilters,
    handleTicketSelect,
    handleSelectionChange,
    handleClearSelection,
  } = useBoardUrlState(projectId, defaultView);

  const isLoading = projectLoading;

  const capacityWindow = useMemo(() => {
    const today = new Date();
    return {
      start: format(today, "yyyy-MM-dd"),
      end: format(addDays(today, 13), "yyyy-MM-dd"),
    };
  }, []);

  const capacityByMemberId = useWorkloadCapacity(
    projectId,
    capacityWindow.start,
    capacityWindow.end,
    { enabled: view === "workload" },
  );

  const handleRetryProject = useCallback(() => void refetchProject(), [refetchProject]);
  const handleRetryTickets = useCallback(() => void refetchTickets(), [refetchTickets]);

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
      <PageWrapper title={<Skeleton className="h-5 w-40" />} noInternalScroll>
        <KanbanBoardSkeleton />
      </PageWrapper>
    );
  }

  // A failure to READ the project is not the same fact as a project that is
  // gone: only the fallback's resolved 404 reaches notFound().
  if (projectError) {
    return (
      <ProjectLoadFallback
        title="Board"
        error={projectErrorValue}
        onRetry={handleRetryProject}
      />
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
          onUpdateView={handleUpdateActiveView}
          isUpdatingView={updateView.isPending}
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
      {/*
        A 500 on GET /build/:id/tickets used to arrive here as `[]`, so the
        board rendered its "No tickets yet — create a ticket to get started"
        empty state over a project that has thousands, and people created
        duplicates.
      */}
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
        hasActiveFilters={hasActiveFilters}
        workloadFilters={workloadFilters}
        capacityByMemberId={capacityByMemberId}
        onTicketSelect={handleTicketSelect}
        onWorkloadFilterChange={handleWorkloadFilterChange}
        onClearWorkloadFilters={handleClearWorkloadFilters}
        sprints={sprints ?? []}
        selectedIds={selectedIds}
        onBulkStatus={handleBulkStatus}
        onBulkPriority={handleBulkPriority}
        onBulkAssignee={handleBulkAssignee}
        onBulkSprint={handleBulkSprint}
        onBulkParent={handleBulkParent}
        onClearSelection={handleClearSelection}
        onSelectionChange={handleSelectionChange}
        isTruncated={isTruncated}
        isFetchingMore={isFetchingMoreTickets}
        onLoadMore={fetchMoreTickets}
        isLoading={ticketsLoading}
        isError={ticketsError}
        error={ticketsErrorValue}
        onRetry={handleRetryTickets}
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
