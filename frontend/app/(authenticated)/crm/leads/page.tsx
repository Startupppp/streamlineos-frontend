"use client";

import { useState, useMemo, useCallback } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { ImportLinkButton } from "@/features/crm/import/import-link-button";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useLeadBoard, useLeadStats, useUpdateLeadStatus, useLeads } from "@/hooks/api/leads";
import { useCrmOptions, resolveOption } from "@/hooks/api/crm/metadata";
import { useLeadsFilters } from "@/hooks/common/use-leads-filters";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useCan, useScope } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LeadsStatsBar } from "@/features/crm/leads/leads-stats-bar";
import { LeadsToolbar } from "@/features/crm/leads/leads-toolbar";
import { LeadListView } from "@/features/crm/leads/lead-list-view";
import {
  CreateLeadSheet,
  LeadDetailSheet,
  LeadExportDialog,
  LeadsFunnelView,
  LeadsKanban,
} from "@/features/crm/leads/leads-lazy";
import { projectBoardColumns } from "@/features/crm/leads/lead-board-columns";
import type { BoardLead } from "@/features/crm/leads/leads-types";
import type { LeadFilters } from "@/types/leads";

const SORT_FIELDS: readonly NonNullable<LeadFilters["sortBy"]>[] = [
  "name",
  "email",
  "company",
  "status",
  "priority",
  "source",
  "score",
  "potentialValue",
  "createdAt",
];

const STATUSES: readonly NonNullable<LeadFilters["status"]>[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
];

const PRIORITIES: readonly NonNullable<LeadFilters["priority"]>[] = ["HOT", "WARM", "COLD"];

const SOURCES: readonly NonNullable<LeadFilters["source"]>[] = [
  "referral",
  "campaign",
  "cold_call",
  "website",
  "social_media",
  "walk_in",
  "other",
];

function pick<T extends string>(allowed: readonly T[], value: string | undefined): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

export default function LeadsPipelinePage() {
  const canCreate = useCan("crm:leads:create");
  const scope = useScope("crm:leads:view");
  const canUpdate = useCan("crm:leads:update");
  const canAssign = useCan("crm:leads:assign");
  const canDelete = useCan("crm:leads:delete");
  const canCreateDeal = useCan("crm:deals:create");

  const {
    data: board,
    isLoading: boardLoading,
    isError: boardError,
    error: boardFetchError,
    refetch: refetchBoard,
  } = useLeadBoard();
  const { data: stats, isLoading: statsLoading, isError: statsError } = useLeadStats();
  const { open: createOpen, onOpenChange: setCreateOpen } = useQueryParamOpen("create");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [density, setDensity] = useDensity();

  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);

  const resetCursors = useCallback(() => setCursorHistory([undefined]), []);

  const handlePrevious = useCallback(() => {
    setCursorHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const handleNext = useCallback((nextCursor: string) => {
    setCursorHistory((prev) => [...prev, nextCursor]);
  }, []);

  const currentCursor = cursorHistory[cursorHistory.length - 1];

  const {
    view,
    searchQuery,
    statusFilter,
    priorityFilter,
    sourceFilter,
    sortColumn,
    sortDirection,
    pageSize,
    setView,
    setSearchQuery,
    setStatusFilter,
    setPriorityFilter,
    setSourceFilter,
    setPageSize,
    clearFilters,
  } = useLeadsFilters();

  const handleSetSearchQuery = useCallback(
    (q: string) => { setSearchQuery(q); resetCursors(); },
    [setSearchQuery, resetCursors],
  );

  const handleSetStatusFilter = useCallback(
    (s: string | undefined) => { setStatusFilter(s); resetCursors(); },
    [setStatusFilter, resetCursors],
  );

  const handleSetPriorityFilter = useCallback(
    (p: string | undefined) => { setPriorityFilter(p); resetCursors(); },
    [setPriorityFilter, resetCursors],
  );

  const handleSetSourceFilter = useCallback(
    (s: string | undefined) => { setSourceFilter(s); resetCursors(); },
    [setSourceFilter, resetCursors],
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
    resetCursors();
  }, [clearFilters, resetCursors]);

  const handleSetPageSize = useCallback(
    (size: number) => { setPageSize(size); resetCursors(); },
    [setPageSize, resetCursors],
  );

  const {
    data: tableData,
    isLoading: tableLoading,
    isError: tableError,
    refetch: refetchTable,
  } = useLeads({
    search: searchQuery.trim() || undefined,
    sortBy: pick(SORT_FIELDS, sortColumn),
    sortOrder: sortDirection,
    cursor: currentCursor,
    limit: pageSize,
    status: pick(STATUSES, statusFilter),
    priority: pick(PRIORITIES, priorityFilter),
    source: pick(SOURCES, sourceFilter),
  });

  const { data: leadStatusOptions = [] } = useCrmOptions("lead_status");
  const { data: leadPriorityOptions = [] } = useCrmOptions("priority");
  const { data: leadSourceOptions = [] } = useCrmOptions("source");

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    const trimmed = searchQuery.trim();
    if (trimmed) labels.push(`search "${trimmed}"`);
    if (statusFilter) labels.push(`status ${resolveOption(leadStatusOptions, statusFilter).label}`);
    if (priorityFilter)
      labels.push(`priority ${resolveOption(leadPriorityOptions, priorityFilter).label}`);
    if (sourceFilter) labels.push(`source ${resolveOption(leadSourceOptions, sourceFilter).label}`);
    return labels;
  }, [
    searchQuery,
    statusFilter,
    priorityFilter,
    sourceFilter,
    leadStatusOptions,
    leadPriorityOptions,
    leadSourceOptions,
  ]);

  const updateStatus = useUpdateLeadStatus();

  const handleOpenCreateLead = useCallback(() => setCreateOpen(true), [setCreateOpen]);
  const handleOpenExport = useCallback(() => setExportOpen(true), []);
  const handleCloseDetail = useCallback(() => setSelectedLeadId(null), []);
  const handleRetryTable = useCallback(() => void refetchTable(), [refetchTable]);
  const handleRetryBoard = useCallback(() => void refetchBoard(), [refetchBoard]);

  const handleViewChange = useCallback(
    (next: "table" | "kanban" | "funnel") => setView(next),
    [setView],
  );

  const filteredBoard = useMemo<Record<string, BoardLead[]> | null>(
    () => projectBoardColumns(board, searchQuery),
    [board, searchQuery],
  );

  const handleMoveStatus = useCallback(
    async (leadId: number, status: string, expectedStatus?: string) => {
      const next = pick(STATUSES, status);
      if (!next) return;
      try {
        await updateStatus.mutateAsync({
          leadId,
          status: next,
          expectedStatus: pick(STATUSES, expectedStatus),
        });
        toast.success(`Lead moved to ${next}`);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
      }
    },
    [updateStatus],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index)
        return;
      if (source.droppableId === destination.droppableId) return;

      void handleMoveStatus(Number(draggableId), destination.droppableId, source.droppableId);
    },
    [handleMoveStatus],
  );

  const hasMore = tableData?.hasMore ?? false;
  const nextCursor = tableData?.nextCursor ?? null;

  const handleNextPage = useCallback(() => {
    if (nextCursor) handleNext(nextCursor);
  }, [nextCursor, handleNext]);

  const pageState = usePageState({
    permission: "crm:leads:view",
    isLoading: boardLoading || statsLoading,
    isError: boardError || statsError,
    error: boardFetchError,
  });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Lead Pipeline" subtitle="Manage your leads">
        <PageState resolution={pageState} loading={null} onRetry={handleRetryBoard} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  if (boardLoading || statsLoading) {
    return (
      <PageWrapper title="Lead Pipeline" noInternalScroll>
        <div className="flex flex-col flex-1 min-h-0 space-y-3">
          <div className="flex gap-2 shrink-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[52px] flex-1 rounded-lg" />
            ))}
          </div>
          <DataTableSkeleton rows={12} columns={6} />
        </div>
      </PageWrapper>
    );
  }

  if (boardError || statsError) {
    return (
      <PageWrapper title="Lead Pipeline">
        <ErrorState
          title="Failed to load leads"
          description="There was an error loading the lead pipeline. Please try again."
          onRetry={handleRetryBoard}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Lead Pipeline"
      subtitle={stats ? `${stats.total} leads` : undefined}
      badge={view === "table" && tableData?.totalCount !== undefined ? String(tableData.totalCount) : undefined}
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenExport}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          {canCreate ? (
            <>
              <ImportLinkButton entity="leads" label="Import Leads" />
              <LoadingButton size="sm" onClick={handleOpenCreateLead}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New lead
              </LoadingButton>
            </>
          ) : null}
        </div>
      }
      filters={
        <div className="flex w-full min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <LeadsToolbar
              searchQuery={searchQuery}
              onSearchChange={handleSetSearchQuery}
              view={view}
              onViewChange={handleViewChange}
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              sourceFilter={sourceFilter}
              onStatusFilterChange={handleSetStatusFilter}
              onPriorityFilterChange={handleSetPriorityFilter}
              onSourceFilterChange={handleSetSourceFilter}
              onClearFilters={handleClearFilters}
              scope={scope}
            />
          </div>
          {view === "table" ? (
            <DensityToggle density={density} onChange={setDensity} className="shrink-0" />
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        {stats && (
          <div className="shrink-0">
            <LeadsStatsBar stats={stats} />
          </div>
        )}

        {view === "table" && (
          <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col">
            <LeadListView
              leads={tableData?.leads ?? []}
              totalCount={tableData?.totalCount}
              cursorPage={cursorHistory.length}
              hasMore={hasMore}
              onPrevious={handlePrevious}
              onNext={handleNextPage}
              onResetPage={resetCursors}
              pageSize={pageSize}
              onPageSizeChange={handleSetPageSize}
              isLoading={tableLoading}
              isError={tableError}
              onRetry={handleRetryTable}
              density={density}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canAssign={canAssign}
              canDelete={canDelete}
              canCreateDeal={canCreateDeal}
              activeFilterLabels={activeFilterLabels}
              onClearFilters={handleClearFilters}
              onCreateLead={handleOpenCreateLead}
            />
          </div>
        )}

        {view === "kanban" && (
          <div className="flex-1 min-h-0 mt-2 overflow-auto">
            <LeadsKanban
              filteredBoard={filteredBoard}
              onDragEnd={handleDragEnd}
              onOpenLead={setSelectedLeadId}
              onMoveStatus={handleMoveStatus}
              canUpdate={canUpdate}
            />
          </div>
        )}

        {view === "funnel" && (
          <div className="flex-1 min-h-0 mt-2 overflow-auto">
            <LeadsFunnelView
              board={filteredBoard}
              searchQuery={searchQuery}
              onClearSearch={handleClearFilters}
              onCreateLead={handleOpenCreateLead}
              canCreate={canCreate}
            />
          </div>
        )}

        {selectedLeadId !== null && (
          <LeadDetailSheet
            leadId={selectedLeadId}
            open
            onClose={handleCloseDetail}
            onMoveStatus={handleMoveStatus}
            canUpdate={canUpdate}
          />
        )}
      </div>

      {createOpen && <CreateLeadSheet open onOpenChange={setCreateOpen} />}
      {exportOpen && <LeadExportDialog open onOpenChange={setExportOpen} />}
    </PageWrapper>
  );
}
