"use client";

import { useMemo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UserIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import { TicketFilterBar } from "@/features/build/shared/ticket-filter-bar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { useAllWork } from "@/hooks/api/build/all-work";
import { useProjects } from "@/hooks/api/build/projects";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useProjectTeams } from "@/hooks/api/build/teams";
import { useManagedProducts } from "@/hooks/api/build/managed-products";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useOrgCustomStates } from "@/hooks/api/build/custom-states";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  CONTENT_FILL_PANEL,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import { pmSnappy, viewSwap, viewSwapReduced } from "@/lib/motion-presets";
import { groupTickets } from "./all-work-ticket-utils";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { AllWorkViewSwitcher, AllWorkSkeleton } from "./all-work-view-switcher";
import { AllWorkListSection } from "./all-work-list-section";
import { AllWorkTableSection } from "./all-work-table-section";
import { AllWorkBoardSection } from "./all-work-board-section";
import { AllWorkCalendarSection } from "./all-work-calendar-section";
import { AllWorkTimelineSection } from "./all-work-timeline-section";
import { AllWorkViewsMenu } from "./all-work-views-menu";
import { useAllWorkFilters } from "./use-all-work-filters";
import { useAllWorkBulk } from "./use-all-work-bulk";
import { useAllWorkIds } from "@/hooks/api/build/all-work";
import { useAllWorkKeyboard } from "./use-all-work-keyboard";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { AllWorkExportPreviewDialog } from "./all-work-export-preview-dialog";
import { useAllWorkExport } from "./use-all-work-export";

const GROUP_OPTIONS = [
  { value: "project", label: "By Project" },
  { value: "status", label: "By Status" },
  { value: "priority", label: "By Priority" },
  { value: "assignee", label: "By Assignee" },
  { value: "none", label: "No grouping" },
] as const;

export function AllWorkPage() {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const shouldReduceMotion = useReducedMotion();
  const swapVariants = shouldReduceMotion ? viewSwapReduced : viewSwap;
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
  const { data: projectsData } = useProjects({
    limit: 100,
  });
  const { data: buildMembersData } = useBuildMembers();
  const { data: orgStates } = useOrgCustomStates();
  const { data: teamsData } = useProjectTeams({ pageSize: 100 });
  const { data: productsData } = useManagedProducts({ limit: 100 });

  const teamOptions = useMemo(
    () => [{ value: "", label: "All teams" }, ...(teamsData?.data ?? []).map((t) => ({ value: String(t.id), label: t.name }))],
    [teamsData],
  );
  const productOptions = useMemo(
    () => [{ value: "", label: "All products" }, ...(productsData?.data ?? []).map((p) => ({ value: String(p.id), label: p.name }))],
    [productsData],
  );

  const handleTeamFilter = useCallback(
    (value: string) => setListParams({ teamId: value || null, cursor: null }),
    [setListParams],
  );
  const handleProductFilter = useCallback(
    (value: string) => setListParams({ productId: value || null, cursor: null }),
    [setListParams],
  );

  const tickets = useMemo(() => data?.data ?? [], [data]);
  const loadedCount = tickets.length;
  const hasMore = data?.hasMore ?? false;
  const nextCursor = data?.nextCursor ?? null;

  const groups = useMemo(() => groupTickets(tickets, grouping), [tickets, grouping]);

  const [storedTrail, setStoredTrail] = useState<(string | null)[]>([null]);
  const cursorTrail = useMemo(
    () =>
      storedTrail[storedTrail.length - 1] === cursor ? storedTrail : [cursor],
    [cursor, storedTrail],
  );
  const hasPrevious = cursorTrail.length > 1;
  const pageNumber = cursorTrail.length;

  const handleNext = useCallback(() => {
    if (!nextCursor) return;
    setStoredTrail([...cursorTrail, nextCursor]);
    setCursor(nextCursor);
  }, [cursorTrail, nextCursor, setCursor]);

  const handlePrev = useCallback(() => {
    if (cursorTrail.length <= 1) return;
    const newTrail = cursorTrail.slice(0, -1);
    setStoredTrail(newTrail);
    setCursor(newTrail[newTrail.length - 1] ?? null);
  }, [cursorTrail, setCursor]);

  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading,
    isError,
    error,
    isEmpty: loadedCount === 0,
  });

  const allProjects = useMemo(() => projectsData?.data ?? [], [projectsData]);
  const projectOptions = useMemo(
    () => allProjects.map((p) => ({ id: p.id, name: p.name, key: p.key })),
    [allProjects],
  );
  const buildMembers = buildMembersData?.data ?? [];

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
    showExpandBanner
      ? {
          scope: filters.scope,
          search: filters.search,
          status: filters.status,
          priority: filters.priority,
          type: filters.type,
          assigneeId: filters.assigneeId,
          labelIds: filters.labelIds,
          cycleId: filters.cycleId,
          epicId: filters.epicId,
          dueDateFrom: filters.dueDateFrom,
          dueDateTo: filters.dueDateTo,
          teamId: filters.teamId,
          managedProductId: filters.managedProductId,
          excludeStatus: filters.excludeStatus,
          projectIds: filters.projectIds,
        }
      : undefined,
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
        setStoredTrail([null]);
      });
    },
    [handleViewChange, setTableSelection],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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
    (value: string) => {
      setListParams({ group: value });
    },
    [setListParams],
  );

  const subtitleText =
    pageState.kind === "loading"
      ? "Loading tickets…"
      : `${loadedCount} ticket${loadedCount === 1 ? "" : "s"} loaded`;

  const emptyNode =
    !isOnline ? (
      <EmptyState
        className={CONTENT_FILL_PANEL}
        illustrationPreset="projects"
        title="You are offline"
        description="Showing cached data. Reconnect to see the latest tickets."
      />
    ) : (
      <EmptyState
        className={CONTENT_FILL_PANEL}
        illustrationPreset="projects"
        title="No tickets yet"
        description={
          hasActiveFilters ? undefined : "Start by creating a ticket in any project."
        }
        filtersActive={hasActiveFilters}
        onClearFilters={handleClearFilters}
        action={!hasActiveFilters ? { label: "All Projects", href: "/build/projects" } : undefined}
      />
    );

  return (
    <PageWrapper
      title="All Work"
      subtitle={subtitleText}
      noInternalScroll
    >
      <PmPageShell>
        <PmSection index={0} className={cn(PM_FILL_SECTION, "gap-3")}>
          <PageTabsToolbar
            tabsDensity="icons"
            filtersAlwaysVisible
            tabs={
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                <AllWorkViewSwitcher
                  activeView={view}
                  onViewChange={handleViewChangeWithReset}
                />
                <AllWorkViewsMenu activeView={view} hasActiveFilters={hasActiveFilters} />
                <Select value={grouping} onValueChange={handleGroupChange}>
                  <SelectTrigger
                    className="w-[120px] shrink-0 font-normal *:data-[slot=select-value]:font-normal"
                    aria-label="Group tickets by"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AnimatedIconButton
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleScopeToggle}
                  aria-label={
                    scopeMine
                      ? "Showing my tickets – click to show all"
                      : "Show only my tickets"
                  }
                  title={scopeMine ? "Showing my tickets" : "Show only my tickets"}
                  aria-pressed={scopeMine}
                  className={cn(
                    "shrink-0",
                    scopeMine &&
                      "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                  )}
                  icon={UserIcon}
                  iconSize={14}
                  iconClassName={cn(scopeMine ? "text-primary-foreground" : undefined)}
                />
              </div>
            }
            filters={
              <TicketFilterBar
                presentation="all-work"
                className="sm:w-auto sm:flex-1"
                members={buildMembers}
                projectOptions={projectOptions}
                showTypeFilter
                showAssigneeFilter
                statuses={orgStates}
                trailing={
                  <>
                    {teamOptions.length > 1 && (
                      <BuildFilterSelect
                        label="Team"
                        value={teamIdFilter ?? ""}
                        onValueChange={handleTeamFilter}
                        options={teamOptions}
                      />
                    )}
                    {productOptions.length > 1 && (
                      <BuildFilterSelect
                        label="Product"
                        value={productIdFilter ?? ""}
                        onValueChange={handleProductFilter}
                        options={productOptions}
                      />
                    )}
                  </>
                }
              />
            }
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
            empty={emptyNode}
          >
            <>
              {tableSelection.size > 0 ? (
                <>
                  <BulkActionBar
                    selectedCount={
                      isExpandedSelection ? expandedTotal : tableSelection.size
                    }
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
                  {showExpandBanner && (
                    <div className="flex items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                      <span>
                        {loadedCount} tickets on this page selected.
                      </span>
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
                        onClick={handleExpandToAll}
                        disabled={!idsSnapshot}
                      >
                        {idsSnapshot
                          ? `Select all ${idsSnapshot.capped ? `${idsSnapshot.cap}+` : idsSnapshot.total} matching tickets`
                          : "Loading…"}
                      </button>
                    </div>
                  )}
                </>
              ) : null}
              <div className="flex min-h-0 flex-1 flex-col gap-0">
                {view === "table" ? (
                  <AllWorkTableSection
                    tickets={tickets}
                    tableSelection={tableSelection}
                    onSelectionChange={setTableSelection}
                    onTicketClick={handleTicketClickForTable}
                    sortState={sortState}
                    hasMore={hasMore}
                    hasPrevious={hasPrevious}
                    pageNumber={pageNumber}
                    onNext={handleNext}
                    onPrevious={handlePrev}
                  />
                ) : view === "calendar" ? (
                  <>
                    <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
                      <AllWorkCalendarSection tickets={tickets} hasMore={hasMore} />
                    </ScrollArea>
                    {hasMore || hasPrevious ? (
                      <TablePagination
                        mode="cursor"
                        rowCount={tickets.length}
                        pageNumber={pageNumber}
                        hasMore={hasMore}
                        hasPrevious={hasPrevious}
                        onNext={handleNext}
                        onPrevious={handlePrev}
                      />
                    ) : null}
                  </>
                ) : view === "timeline" ? (
                  <>
                    <AllWorkTimelineSection
                      tickets={tickets}
                      hasMore={hasMore}
                      onTicketClick={handleTicketClickForTable}
                    />
                    {hasMore || hasPrevious ? (
                      <TablePagination
                        mode="cursor"
                        rowCount={tickets.length}
                        pageNumber={pageNumber}
                        hasMore={hasMore}
                        hasPrevious={hasPrevious}
                        onNext={handleNext}
                        onPrevious={handlePrev}
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
                      <div
                        className={cn(
                          "flex flex-1 flex-col overscroll-contain",
                          view === "board" ? "h-full min-h-0" : "min-h-full",
                        )}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {view === "list" ? (
                            <motion.div
                              key="list-view"
                              variants={swapVariants}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              transition={pmSnappy}
                            >
                              <AllWorkListSection
                                groups={groups}
                                hasMore={hasMore}
                                tableSelection={tableSelection}
                                onSelectionChange={setTableSelection}
                              />
                            </motion.div>
                          ) : null}
                          {view === "board" ? (
                            <motion.div
                              key="board-view"
                              variants={swapVariants}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              transition={pmSnappy}
                              className="flex h-full min-h-0 w-full flex-1 flex-col"
                            >
                              <AllWorkBoardSection
                                groups={groups}
                                hasMore={hasMore}
                                tableSelection={tableSelection}
                                onSelectionChange={setTableSelection}
                              />
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </ScrollArea>
                    {hasMore || hasPrevious ? (
                      <TablePagination
                        mode="cursor"
                        rowCount={tickets.length}
                        pageNumber={pageNumber}
                        hasMore={hasMore}
                        hasPrevious={hasPrevious}
                        onNext={handleNext}
                        onPrevious={handlePrev}
                      />
                    ) : null}
                  </>
                )}
              </div>
            </>
          </PageState>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
