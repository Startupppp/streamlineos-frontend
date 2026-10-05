"use client";

import { useMemo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import { useAllWork } from "@/hooks/api/build/all-work";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  CONTENT_FILL_PANEL,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import { groupTickets } from "./all-work-ticket-utils";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { AllWorkSkeleton } from "./all-work-view-switcher";
import { useAllWorkFilters } from "./use-all-work-filters";
import { useAllWorkBulk } from "./use-all-work-bulk";
import { useAllWorkIds } from "@/hooks/api/build/all-work";
import { useAllWorkKeyboard } from "./use-all-work-keyboard";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { AllWorkExportPreviewDialog } from "./all-work-export-preview-dialog";
import { useAllWorkExport } from "./use-all-work-export";
import { useAllWorkCursor } from "./use-all-work-cursor";
import { AllWorkExpandBanner, AllWorkEmptyState } from "./all-work-expand-banner";
import { useAllWorkPageData } from "./use-all-work-page-data";
import { AllWorkPageToolbar } from "./all-work-page-toolbar";
import { AllWorkViewContent } from "./all-work-view-content";

export function AllWorkPage() {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const isOnline = useOnlineStatus();

  const {
    view,
    scopeMine,
    filters,
    productIdFilter,
    teamIdFilter,
    grouping,
    sortField,
    sortDirection,
    cursor,
    hasActiveFilters,
    handleViewChange,
    handleScopeToggle,
    handleClearFilters,
    setListParams,
    setCursor,
  } = useAllWorkFilters();

  const { data, isLoading, isError, error, refetch } = useAllWork(filters);

  const {
    projectOptions,
    buildMembers,
    orgStates,
    teamOptions,
    productOptions,
    handleTeamFilter,
    handleProductFilter,
  } = useAllWorkPageData({ setListParams, teamIdFilter, productIdFilter });

  const tickets = useMemo(() => data?.data ?? [], [data]);
  const loadedCount = tickets.length;
  const hasMore = data?.hasMore ?? false;
  const nextCursor = data?.nextCursor ?? null;

  const groups = useMemo(() => groupTickets(tickets, grouping), [tickets, grouping]);

  const { hasPrevious, pageNumber, handleNext, handlePrev, resetTrail } =
    useAllWorkCursor({ cursor, nextCursor, setCursor });

  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading,
    isError,
    error,
    isEmpty: loadedCount === 0,
  });

  const {
    tableSelection,
    setTableSelection,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycleNoOp,
    handleClearSelection,
    isExpandedSelection,
    expandedTotal,
    expandedEntries,
    expandToAllMatching,
  } = useAllWorkBulk(tickets);

  const allPageSelected =
    tickets.length > 0 && tickets.every((t) => tableSelection.has(t.id));
  const showExpandBanner = allPageSelected && hasMore && !isExpandedSelection;

  const { data: idsSnapshot } = useAllWorkIds(
    showExpandBanner ? {
      scope: filters.scope, search: filters.search, status: filters.status,
      priority: filters.priority, type: filters.type, assigneeId: filters.assigneeId,
      labelIds: filters.labelIds, cycleId: filters.cycleId, epicId: filters.epicId,
      dueDateFrom: filters.dueDateFrom, dueDateTo: filters.dueDateTo, teamId: filters.teamId,
      managedProductId: filters.managedProductId, excludeStatus: filters.excludeStatus,
      projectIds: filters.projectIds,
    } : undefined,
    { enabled: showExpandBanner },
  );

  const handleExpandToAll = useCallback(() => {
    if (idsSnapshot) expandToAllMatching(idsSnapshot);
  }, [idsSnapshot, expandToAllMatching]);

  const [focusedIndex, setFocusedIndex] = useState(0);

  const allWorkExport = useAllWorkExport(tableSelection, tickets, expandedEntries);

  const handleTicketClickForTable = useCallback(
    (ticketId: number) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket || ticket.projectId === null) return;
      const projectId = ticket.projectId;
      requestLeave(() =>
        router.push(
          getTicketDetailHref(projectId, ticket.projectKey, ticket.ticketNumber),
        ),
      );
    },
    [tickets, requestLeave, router],
  );

  const handleViewChangeWithReset = useCallback(
    (v: Parameters<typeof handleViewChange>[0]) => {
      handleViewChange(v, () => {
        setTableSelection(new Set());
        resetTrail();
      });
    },
    [handleViewChange, setTableSelection, resetTrail],
  );

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleFocusSearch = useCallback(() => {
    document
      .querySelector<HTMLInputElement>('input[type="search"], [data-search-input] input')
      ?.focus();
  }, []);

  const handleKeyboardOpen = useCallback(() => {
    const ticket = tickets[focusedIndex];
    if (!ticket || ticket.projectId === null) return;
    const projectId = ticket.projectId;
    requestLeave(() =>
      router.push(
        getTicketDetailHref(projectId, ticket.projectKey ?? "", ticket.ticketNumber),
      ),
    );
  }, [tickets, focusedIndex, requestLeave, router]);

  const handleKeyboardNext = useCallback(
    () => setFocusedIndex((i) => Math.min(i + 1, tickets.length - 1)),
    [tickets.length],
  );
  const handleKeyboardPrev = useCallback(
    () => setFocusedIndex((i) => Math.max(i - 1, 0)),
    [],
  );

  useAllWorkKeyboard({
    onNext: handleKeyboardNext,
    onPrev: handleKeyboardPrev,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleClearSelection,
    onFocusSearch: handleFocusSearch,
  });

  const sortState = useMemo(
    () => ({
      fields: ["rank", "created", "updated", "priority", "dueDate"] as const,
      field: sortField,
      direction: sortDirection,
      onChange: (field: string, direction: "asc" | "desc") => {
        setListParams({ sort: field, dir: direction });
      },
    }),
    [sortField, sortDirection, setListParams],
  );

  const handleGroupChange = useCallback(
    (value: string) => { setListParams({ group: value }); },
    [setListParams],
  );

  const subtitleText =
    pageState.kind === "loading"
      ? "Loading tickets…"
      : `${loadedCount} ticket${loadedCount === 1 ? "" : "s"} loaded`;

  return (
    <PageWrapper title="All Work" subtitle={subtitleText} noInternalScroll>
      <PmPageShell>
        <PmSection index={0} className={cn(PM_FILL_SECTION, "gap-3")}>
          <AllWorkPageToolbar
            view={view}
            onViewChange={handleViewChangeWithReset}
            grouping={grouping}
            onGroupChange={handleGroupChange}
            scopeMine={scopeMine}
            onScopeToggle={handleScopeToggle}
            buildMembers={buildMembers}
            projectOptions={projectOptions}
            orgStates={orgStates}
            teamOptions={teamOptions}
            productOptions={productOptions}
            teamIdFilter={teamIdFilter}
            productIdFilter={productIdFilter}
            onTeamFilter={handleTeamFilter}
            onProductFilter={handleProductFilter}
            hasActiveFilters={hasActiveFilters}
          />

          <PageState
            resolution={pageState}
            className={CONTENT_FILL_PANEL}
            onRetry={handleRetry}
            loading={
              <PmPanel solid className="flex-1 overflow-auto">
                <div className="py-2">
                  <AllWorkSkeleton view={view} />
                </div>
              </PmPanel>
            }
            empty={<AllWorkEmptyState isOnline={isOnline} hasActiveFilters={hasActiveFilters} onClearFilters={handleClearFilters} />}
          >
            <>
              {tableSelection.size > 0 ? (
                <>
                  <BulkActionBar
                    selectedCount={isExpandedSelection ? expandedTotal : tableSelection.size}
                    members={buildMembers}
                    cycles={[]}
                    statuses={orgStates}
                    hideCycle
                    onBulkStatus={handleBulkStatus}
                    onBulkPriority={handleBulkPriority}
                    onBulkAssignee={handleBulkAssignee}
                    onBulkCycle={handleBulkCycleNoOp}
                    onBulkExport={allWorkExport.handleOpen}
                    onClear={handleClearSelection}
                  />
                  <AllWorkExportPreviewDialog
                    open={allWorkExport.open}
                    onOpenChange={allWorkExport.setOpen}
                    groups={allWorkExport.groups}
                    isExporting={allWorkExport.isExporting}
                    onConfirm={allWorkExport.handleConfirm}
                  />
                  <AllWorkExpandBanner
                    show={showExpandBanner}
                    loadedCount={loadedCount}
                    idsSnapshot={idsSnapshot}
                    onExpandToAll={handleExpandToAll}
                  />
                </>
              ) : null}
              <div className="flex min-h-0 flex-1 flex-col gap-0">
                <AllWorkViewContent
                  view={view}
                  tickets={tickets}
                  groups={groups}
                  tableSelection={tableSelection}
                  onSelectionChange={setTableSelection}
                  sortState={sortState}
                  hasMore={hasMore}
                  hasPrevious={hasPrevious}
                  pageNumber={pageNumber}
                  onNext={handleNext}
                  onPrevious={handlePrev}
                  onTicketClick={handleTicketClickForTable}
                />
              </div>
            </>
          </PageState>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
