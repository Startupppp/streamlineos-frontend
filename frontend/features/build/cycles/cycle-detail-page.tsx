"use client";

import { notFound } from "next/navigation";
import { KanbanBoard } from "@/features/build/views/kanban-board";
import { ListView } from "@/features/build/views/list-view";
import { ViewSwitcher } from "@/features/build/views/view-switcher";
import { DisplayOptionsPanel } from "@/features/build/views/display-options-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageState } from "@/components/shared/page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import { useCycleDetail } from "./use-cycle-detail";

interface CycleDetailPageProps {
  projectId: string;
  cycleId: string;
}

export function CycleDetailPage({
  projectId: projectIdStr,
  cycleId: cycleIdStr,
}: CycleDetailPageProps) {
  const projectId = parseInt(projectIdStr);
  const cycleId = parseInt(cycleIdStr);

  const {
    view,
    listFilters,
    searchInputRef,
    displayOptions,
    setDisplayOptions,
    selectedIds,
    canUpdate,
    listSelection,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycle,
    handleClearSelection,
    projectData,
    isLoading,
    isError,
    loadError,
    pageState,
    cycle,
    cycles,
    statuses,
    wipLimits,
    cycleTickets,
    members,
    cycleTitle,
    cycleDateRange,
    handleTicketSelect,
    handleRetry,
    handleViewChange,
  } = useCycleDetail(projectId, cycleId);

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "error" &&
    pageState.kind !== "loading"
  )
    return (
      <PageWrapper title="Cycle" backHref={`/build/${projectId}/cycles`}>
        <PageState
          resolution={pageState}
          loading={null}
          onRetry={handleRetry}
          className="flex-1"
        >
          {null}
        </PageState>
      </PageWrapper>
    );

  if (pageState.kind === "loading" || isLoading) {
    return (
      <PageWrapper title="Cycle" noInternalScroll>
        <KanbanBoardSkeleton />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Cycle" backHref={`/build/${projectId}/cycles`}>
        <ErrorState
          className="flex-1"
          title="Couldn't load this cycle"
          description={getErrorMessage(loadError)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (!projectData || (cycles && !cycle)) {
    notFound();
  }

  return (
    <PageWrapper
      title={cycleTitle}
      subtitle={cycleDateRange}
      backHref={`/build/${projectId}/cycles`}
      noInternalScroll
      contentClassName="!p-0"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search tickets",
            inputRef: searchInputRef,
          }}
          trailing={
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              <ViewSwitcher activeView={view} onViewChange={handleViewChange} />
              <DisplayOptionsPanel
                viewType={view}
                options={displayOptions}
                onChange={setDisplayOptions}
              />
              {cycle?.status && (
                <Badge variant="secondary" className="h-6 text-xs capitalize">
                  <Calendar className="mr-1 h-3 w-3" />
                  {cycle.status}
                </Badge>
              )}
            </div>
          }
          onClearAll={listFilters.clearAll}
          className="max-md:flex-col max-md:items-stretch max-md:[&>[data-slot=build-toolbar-actions]]:w-full"
        />
      }
    >
      <div className={cn(PAGE_CHROME_X, "flex min-h-0 flex-1 flex-col")}>
        {cycleTickets.length === 0 ? (
          listFilters.debouncedSearch ? (
            <EmptyState
              illustrationPreset="ticket"
              title="No matches"
              description="No tickets in this cycle match your search."
            />
          ) : (
            <EmptyState
              illustrationPreset="ticket"
              title="No tickets in this cycle"
              description="Add tickets to this cycle to track progress here."
            />
          )
        ) : (
          <>
            {view === "board" && (
              <div className="h-full min-h-0 min-w-0 w-full overflow-hidden pb-1">
                <KanbanBoard
                  tickets={cycleTickets}
                  projectId={projectId}
                  projectKey={projectData?.key}
                  statuses={statuses}
                  wipLimits={wipLimits}
                  onTicketSelect={handleTicketSelect}
                  displayOptions={displayOptions}
                  filters={{ cycle: String(cycleId) }}
                />
              </div>
            )}
            {view === "list" && (
              <div className="h-full min-h-0 overflow-y-auto pb-2 pt-0">
                {canUpdate && selectedIds.size > 0 && (
                  <BulkActionBar selectedCount={selectedIds.size} members={members} cycles={cycles ?? []} statuses={statuses} onBulkStatus={handleBulkStatus} onBulkPriority={handleBulkPriority} onBulkAssignee={handleBulkAssignee} onBulkCycle={handleBulkCycle} onClear={handleClearSelection} />
                )}
                <ListView
                  tickets={cycleTickets}
                  onTicketClick={handleTicketSelect}
                  groupBy={displayOptions.groupBy !== "none" ? displayOptions.groupBy : undefined}
                  rowBy={displayOptions.rowBy !== "none" ? displayOptions.rowBy : undefined}
                  projectKey={projectData?.key}
                  projectStatuses={statuses}
                  displayOptions={displayOptions}
                  showEmptyColumns={displayOptions.showEmptyColumns}
                  showEmptyRows={displayOptions.showEmptyRows}
                  projectId={projectId}
                  selection={listSelection}
                />
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
