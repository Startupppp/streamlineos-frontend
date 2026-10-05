"use client";

import { use, useCallback, useMemo, useRef, useState } from "react";
import { format, addDays } from "date-fns";
import { useProject, useProjectLabels } from "@/hooks/api/build/projects";
import { useCycles } from "@/hooks/api/build/advanced";
import { useBulkUpdateTickets } from "@/hooks/api/build/tickets";
import { useWorkloadCapacity } from "@/hooks/api/build/workload-capacity";
import { useExportTickets } from "@/hooks/api/build/ticket-import-export";
import { downloadTextFile } from "@/features/build/import-export/download-text-file";
import type { BulkUpdateTicketsInput } from "@/hooks/api/build/tickets";
import { useBoardUrlState } from "@/features/build/views/use-board-url-state";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { ProjectBoardContent } from "@/features/build/views/project-board-content";
import { ProjectViewsToolbar } from "@/features/build/views/project-views-toolbar";
import { ProjectBoardHeaderActions } from "@/features/build/project-detail/project-board-header-actions";
import { SaveViewDialog } from "@/features/build/views/save-view-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectLoadFallback } from "@/features/build/shared/project-load-fallback";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { notFound } from "next/navigation";
import type { ViewType } from "@/features/build/views/view-switcher";
import { PageState } from "@/components/shared/page-state";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";

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
  const { data: orgLabels } = useProjectLabels();
  const exportMutation = useExportTickets(projectId);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

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
    showFirstRunState,
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

  const { data: capacityByMemberId } = useWorkloadCapacity(
    projectId,
    capacityWindow.start,
    capacityWindow.end,
    undefined,
    { enabled: view === "workload" },
  );

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const handleOpenFocusedTicket = useCallback(
    (index: number) => {
      const ticket = filteredTickets[index];
      if (ticket) handleTicketSelect(Number(ticket.id));
    },
    [filteredTickets, handleTicketSelect],
  );

  const canCreateTicket = useCan("build:tickets:create");

  const handleKeyboardCreate = useCallback(
    () => handleCreateOpenChange(true),
    [handleCreateOpenChange],
  );

  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  const { focusedIndex } = useBuildListKeyboard({
    itemCount: filteredTickets.length,
    onOpen: handleOpenFocusedTicket,
    onEdit: handleOpenFocusedTicket,
    onClearSelection: handleClearSelection,
    onCreate: canCreateTicket ? handleKeyboardCreate : undefined,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef,
    enabled: view === "list",
  });

  const focusedTicketId =
    focusedIndex === null
      ? null
      : Number(filteredTickets[focusedIndex]?.id ?? null);

  const handleRetryProject = useCallback(
    () => void refetchProject(),
    [refetchProject],
  );
  const handleRetryTickets = useCallback(
    () => void refetchTickets(),
    [refetchTickets],
  );

  const handleBulkUpdate = useCallback(
    (
      update: Partial<
        Pick<
          BulkUpdateTicketsInput,
          | "assigneeId"
          | "status"
          | "cycleId"
          | "priority"
          | "parentTicketId"
          | "labelIds"
          | "archive"
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
            const blockedCount = d.blocked?.length ?? 0;
            if (blockedCount > 0 && d.updated === 0) {
              toast.error(
                `${blockedCount} ticket${blockedCount !== 1 ? "s" : ""} could not be archived — ${blockedCount !== 1 ? "they have" : "it has"} active sub-tasks not in the selection. Nothing was changed.`,
              );
              return;
            }
            if (blockedCount > 0) {
              toast.warning(
                `${d.updated} archived, ${blockedCount} could not be archived — ${blockedCount !== 1 ? "they have" : "it has"} active sub-tasks not in the selection.`,
              );
              handleClearSelection();
              return;
            }
            toast.success(
              `${d.updated} ticket${d.updated !== 1 ? "s" : ""} updated`,
            );
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
    (v: string) =>
      handleBulkUpdate({ cycleId: v === "backlog" ? null : Number(v) }),
    [handleBulkUpdate],
  );
  const handleBulkParent = useCallback(
    (parentTicketId: number | null) => handleBulkUpdate({ parentTicketId }),
    [handleBulkUpdate],
  );

  const handleBulkLabel = useCallback(
    (labelId: string) => handleBulkUpdate({ labelIds: [Number(labelId)] }),
    [handleBulkUpdate],
  );

  const handleBulkArchiveRequest = useCallback(
    () => setArchiveConfirmOpen(true),
    [],
  );

  const handleBulkArchiveConfirm = useCallback(() => {
    handleBulkUpdate({ archive: true });
    setArchiveConfirmOpen(false);
  }, [handleBulkUpdate]);

  const handleArchiveDialogChange = useCallback(
    (open: boolean) => setArchiveConfirmOpen(open),
    [],
  );

  const handleBulkExport = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error("No tickets selected");
      return;
    }
    exportMutation.mutate(
      { format: "csv", ticketIds: [...selectedIds].map(Number) },
      {
        onSuccess: (result) => {
          downloadTextFile(result.filename, result.contentType, result.content);
          toast.success(
            `Exported ${result.rowCount} ticket${result.rowCount !== 1 ? "s" : ""}`,
          );
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [selectedIds, exportMutation]);

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

  if (resolution.kind !== "ready" && resolution.kind !== "error") {
    return (
      <PageWrapper title="Board" noInternalScroll>
        <PageState resolution={resolution} loading={<KanbanBoardSkeleton />}>
          {null}
        </PageState>
      </PageWrapper>
    );
  }

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
      contentClassName="!p-0 flex min-h-0 min-w-0 flex-col overflow-hidden"
      className="relative"
      actions={
        <ProjectBoardHeaderActions
          projectId={projectId}
          createDefaultCycleId={createDefaultCycleId}
          createOpen={createParamOpen}
          onCreateOpenChange={handleCreateOpenChange}
        />
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
          searchInputRef={searchInputRef}
        />
      }
    >
      {showFirstRunState ? (
        <EmptyState
          illustrationPreset="ticket"
          title="No tickets yet"
          description="Create your first ticket to get started tracking work."
          action={
            canCreateTicket
              ? { label: "Create ticket", onClick: handleKeyboardCreate }
              : undefined
          }
          className="min-h-full w-full flex-1"
        />
      ) : (
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
          onBulkLabel={handleBulkLabel}
          onBulkArchive={handleBulkArchiveRequest}
          onBulkExport={handleBulkExport}
          labels={orgLabels}
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
      )}
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
      <ShortcutHelpDialog
        open={shortcutHelpOpen}
        onOpenChange={setShortcutHelpOpen}
      />
      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={handleArchiveDialogChange}
        title="Archive selected tickets?"
        description={`Archive ${selectedIds.size} ticket${selectedIds.size !== 1 ? "s" : ""}? Tickets with active sub-tasks not in your selection cannot be archived and nothing will change.`}
        confirmLabel={`Archive ${selectedIds.size} ticket${selectedIds.size !== 1 ? "s" : ""}`}
        destructive
        isPending={bulkUpdate.isPending}
        onConfirm={handleBulkArchiveConfirm}
      />
    </PageWrapper>
  );
}
