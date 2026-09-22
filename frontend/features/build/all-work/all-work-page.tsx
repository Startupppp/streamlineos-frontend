"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UserIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BulkActionBar } from "@/features/build/backlog/bulk-action-bar";
import { TicketFilterBar } from "@/features/build/shared/ticket-filter-bar";
import { useAllWork, useProjects } from "@/hooks/api/build";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useOrgCustomStates } from "@/hooks/api/build/custom-states";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import { pmSnappy, viewSwap, viewSwapReduced } from "@/lib/motion-presets";
import { groupTickets } from "./all-work-ticket-utils";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { AllWorkViewSwitcher, AllWorkSkeleton } from "./all-work-view-switcher";
import { AllWorkListSection } from "./all-work-list-section";
import { AllWorkTableSection } from "./all-work-table-section";
import { AllWorkBoardSection } from "./all-work-board-section";
import { AllWorkViewsMenu } from "./all-work-views-menu";
import { useAllWorkFilters } from "./use-all-work-filters";
import { useAllWorkBulk } from "./use-all-work-bulk";
import { useAllWorkKeyboard } from "./use-all-work-keyboard";

const GROUP_OPTIONS = [
  { value: "project", label: "By Project" },
  { value: "status", label: "By Status" },
  { value: "priority", label: "By Priority" },
  { value: "assignee", label: "By Assignee" },
  { value: "none", label: "No grouping" },
] as const;

interface AllWorkPageProps {
  pmWorkspaceId?: string;
}

export function AllWorkPage({ pmWorkspaceId }: AllWorkPageProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const swapVariants = shouldReduceMotion ? viewSwapReduced : viewSwap;
  const isOnline = useOnlineStatus();

  const {
    view,
    scopeMine,
    filters,
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
  } = useAllWorkFilters(pmWorkspaceId);

  const { data, isLoading, isError, error, refetch } = useAllWork(filters);
  const { data: projectsData } = useProjects({
    limit: 100,
    ...(pmWorkspaceId ? { pmWorkspaceId } : {}),
  });
  const { data: orgStates } = useOrgCustomStates();

  const tickets = useMemo(() => data?.data ?? [], [data]);
  const loadedCount = tickets.length;
  const hasMore = data?.hasMore ?? false;
  const nextCursor = data?.nextCursor ?? null;

  const groups = useMemo(() => groupTickets(tickets, grouping), [tickets, grouping]);

  const [cursorTrail, setCursorTrail] = useState<(string | null)[]>([null]);
  const hasPrevious = cursorTrail.length > 1;
  const pageNumber = cursorTrail.length;

  useEffect(() => {
    if (cursor === null) setCursorTrail([null]);
  }, [cursor]);

  const handleNext = useCallback(() => {
    if (!nextCursor) return;
    setCursorTrail((t) => [...t, nextCursor]);
    setCursor(nextCursor);
  }, [nextCursor, setCursor]);

  const handlePrev = useCallback(() => {
    if (cursorTrail.length <= 1) return;
    const newTrail = cursorTrail.slice(0, -1);
    setCursorTrail(newTrail);
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
  const deduplicatedMembers = useMemo(
    () =>
      allProjects
        .flatMap((p) => p.members)
        .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
        .map(
          (m): {
            id: string;
            name: string | null;
            firstName: string | null;
            lastName: string | null;
            image: string | null;
          } => ({
            id: m.id,
            name: null,
            firstName: m.firstName,
            lastName: m.lastName,
            image: m.image,
          }),
        ),
    [allProjects],
  );

  const {
    tableSelection,
    setTableSelection,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkCycleNoOp,
    handleClearSelection,
  } = useAllWorkBulk(tickets);

  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleTicketClickForTable = useCallback(
    (ticketId: number) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket || ticket.projectId === null) return;
      router.push(
        getTicketDetailHref(ticket.projectId, ticket.projectKey, ticket.ticketNumber),
      );
    },
    [tickets, router],
  );

  const handleViewChangeWithReset = useCallback(
    (v: Parameters<typeof handleViewChange>[0]) => {
      handleViewChange(v, () => {
        setTableSelection(new Set());
        setCursorTrail([null]);
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
    router.push(
      getTicketDetailHref(ticket.projectId, ticket.projectKey ?? "", ticket.ticketNumber),
    );
  }, [tickets, focusedIndex, router]);

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
        className={PM_FILL_PANEL}
        illustrationPreset="projects"
        title="You are offline"
        description="Showing cached data. Reconnect to see the latest tickets."
      />
    ) : (
      <EmptyState
        className={PM_FILL_PANEL}
        illustrationPreset="projects"
        title="No tickets yet"
        description={
          hasActiveFilters ? undefined : "Start by creating a ticket in any project."
        }
        filtersActive={hasActiveFilters}
        onClearFilters={handleClearFilters}
        action={!hasActiveFilters ? { label: "All Projects", href: "/build" } : undefined}
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
            tabs={
              <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide sm:gap-2 [&>*]:shrink-0">
                <AllWorkViewSwitcher
                  activeView={view}
                  onViewChange={handleViewChangeWithReset}
                />
                <AllWorkViewsMenu activeView={view} hasActiveFilters={hasActiveFilters} />
                <Select value={grouping} onValueChange={handleGroupChange}>
                  <SelectTrigger
                    className="w-[120px] shrink-0 text-xs font-normal *:data-[slot=select-value]:font-normal"
                    aria-label="Group tickets by"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
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
                members={deduplicatedMembers}
                projectOptions={projectOptions}
                showTypeFilter
                showAssigneeFilter
                statuses={orgStates}
              />
            }
          />

          <PageState
            resolution={pageState}
            className={PM_FILL_PANEL}
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
                <BulkActionBar
                  selectedCount={tableSelection.size}
                  members={deduplicatedMembers}
                  cycles={[]}
                  statuses={orgStates}
                  hideCycle
                  onBulkStatus={handleBulkStatus}
                  onBulkPriority={handleBulkPriority}
                  onBulkAssignee={handleBulkAssignee}
                  onBulkCycle={handleBulkCycleNoOp}
                  onClear={handleClearSelection}
                />
              ) : null}
              <div className="flex min-h-0 flex-1 flex-col gap-0">
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
                      {view === "table" ? (
                        <motion.div
                          key="table-view"
                          variants={swapVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={pmSnappy}
                        >
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
                {view !== "table" && (hasMore || hasPrevious) ? (
                  <div className="flex items-center justify-center gap-2 border-t py-2">
                    {hasPrevious ? (
                      <Button variant="ghost" size="sm" onClick={handlePrev}>
                        ← Previous
                      </Button>
                    ) : null}
                    {hasMore ? (
                      <Button variant="ghost" size="sm" onClick={handleNext}>
                        Next →
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          </PageState>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
