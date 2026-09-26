"use client";

import { use, useCallback, useMemo } from "react";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { Clock3 } from "lucide-react";
import { useProject, useCycles, useBulkUpdateTickets } from "@/hooks/api";
import { useWorkloadCapacity } from "@/hooks/api/build/workload-capacity";
import type { BulkUpdateTicketsInput } from "@/hooks/api";
import { useBoardUrlState } from "@/features/build/views/use-board-url-state";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { ProjectBoardContent } from "@/features/build/views/project-board-content";
import { ProjectViewsToolbar } from "@/features/build/views/project-views-toolbar";
import { CreateTicketDialog } from "@/features/build/tickets/create-ticket-dialog";
import { ProjectAiMenu } from "@/features/build/ai/project-ai-menu";
import { TicketImportExportDialog } from "@/features/build/import-export/components/ticket-import-export-dialog";
import { SaveViewDialog } from "@/features/build/views/save-view-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectLoadFallback } from "@/features/build/shared/project-load-fallback";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { notFound } from "next/navigation";
import type { ViewType } from "@/features/build/views/view-switcher";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";

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
  const { data: cycles } = useCycles(projectId);
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const {
    view,
    filterType,
    filterSeverity,
    filterQaState,
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
    boardFilters,
    activeView,
    createParamOpen,
    createDefaultCycleId,
    handleViewChange,
    handleClearSearch,
    handleQaFilterChange,
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

  const handleOpenFocusedTicket = useCallback(
    (index: number) => {
      const ticket = filteredTickets[index];
      if (ticket) handleTicketSelect(Number(ticket.id));
    },
    [filteredTickets, handleTicketSelect],
  );

  const { focusedIndex } = useBuildListKeyboard({
    itemCount: filteredTickets.length,
    onOpen: handleOpenFocusedTicket,
    onClearSelection: handleClearSelection,
    enabled: view === "list",
  });

  const focusedTicketId =
    focusedIndex === null ? null : Number(filteredTickets[focusedIndex]?.id ?? null);

  const handleRetryProject = useCallback(() => void refetchProject(), [refetchProject]);
  const handleRetryTickets = useCallback(() => void refetchTickets(), [refetchTickets]);

  const handleBulkUpdate = useCallback(
    (
      update: Partial<
        Pick<
          BulkUpdateTicketsInput,
          "assigneeId" | "status" | "cycleId" | "priority" | "parentTicketId"
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
  const handleBulkCycle = useCallback(
    (v: string) => handleBulkUpdate({ cycleId: v === "backlog" ? null : Number(v) }),
    [handleBulkUpdate],
  );
  const handleBulkParent = useCallback(
    (parentTicketId: number | null) => handleBulkUpdate({ parentTicketId }),
    [handleBulkUpdate],
  );

  const resolution = usePageState({
    permission: "build:view",
    isLoading,
    isError: projectError,
    error: projectErrorValue,
  });

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

  if (resolution.kind !== "ready") {
    return (
      <PageWrapper title="Board" noInternalScroll>
        <PageState resolution={resolution} loading={<KanbanBoardSkeleton />}>
          {null}
        </PageState>
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
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center [&>*]:w-full sm:[&>*]:w-auto [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/timesheets?projectId=${projectId}`}>
              <Clock3 aria-hidden="true" />
              Log time
            </Link>
          </Button>
          <ProjectAiMenu projectId={projectId} />
          <TicketImportExportDialog projectId={projectId} />
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
          filterType={filterType}
          filterSeverity={filterSeverity}
          filterQaState={filterQaState}
          onQaFilterChange={handleQaFilterChange}
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
        focusedTicketId={focusedTicketId}
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
        boardFilters={boardFilters}
        workloadFilters={workloadFilters}
        capacityByMemberId={capacityByMemberId}
        onTicketSelect={handleTicketSelect}
        onWorkloadFilterChange={handleWorkloadFilterChange}
        onClearWorkloadFilters={handleClearWorkloadFilters}
        cycles={cycles ?? []}
        selectedIds={selectedIds}
        onBulkStatus={handleBulkStatus}
        onBulkPriority={handleBulkPriority}
        onBulkAssignee={handleBulkAssignee}
        onBulkCycle={handleBulkCycle}
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
