"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { User } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { BulkActionBar } from "@/features/projects/backlog/bulk-action-bar";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { useAllWork, useProjects } from "@/hooks/api/projects";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/projects/shared/pm-chrome";
import {
  pmSnappy,
  viewSwap,
  viewSwapReduced,
} from "@/features/projects/shared/pm-motion";
import { groupByProject } from "./all-work-ticket-utils";
import { getTicketDetailHref } from "@/features/projects/shared/format-ticket-key";
import { AllWorkViewSwitcher, AllWorkSkeleton } from "./all-work-view-switcher";
import { AllWorkListSection } from "./all-work-list-section";
import { AllWorkTableSection } from "./all-work-table-section";
import { AllWorkBoardSection } from "./all-work-board-section";
import { AllWorkViewsMenu } from "./all-work-views-menu";
import { PaginationFooter } from "./all-work-pagination";
import { useAllWorkFilters } from "./use-all-work-filters";
import { useAllWorkBulk } from "./use-all-work-bulk";

export function AllWorkPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const swapVariants = shouldReduceMotion ? viewSwapReduced : viewSwap;

  const {
    view,
    page,
    scopeMine,
    filters,
    hasActiveFilters,
    handleViewChange,
    handleScopeToggle,
    handlePageChange,
    handleClearFilters,
  } = useAllWorkFilters();

  const { data: allWorkData, isLoading, isError, refetch } = useAllWork(filters);
  const { data: projectsData } = useProjects({ limit: 100 });

  const tickets = allWorkData?.data ?? [];
  const total = allWorkData?.total ?? 0;
  const currentPage = allWorkData?.page ?? page;
  const limit = allWorkData?.limit ?? 50;

  const projectGroups = useMemo(() => groupByProject(tickets), [tickets]);

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
          (
            m,
          ): {
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
    isPendingBulk: _isPendingBulk,
    handleBulkStatus,
    handleBulkPriority,
    handleBulkAssignee,
    handleBulkSprintNoOp,
    handleClearSelection,
  } = useAllWorkBulk(tickets);

  const handleTicketClickForTable = useCallback(
    (ticketId: number) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) return;
      router.push(
        getTicketDetailHref(ticket.projectId, ticket.projectKey, ticket.ticketNumber),
      );
    },
    [tickets, router],
  );

  const handleViewChangeWithReset = useCallback(
    (v: Parameters<typeof handleViewChange>[0]) => {
      handleViewChange(v, () => setTableSelection(new Set()));
    },
    [handleViewChange, setTableSelection],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const subtitleText = isLoading
    ? "Loading workspace tickets…"
    : `${total} ticket${total === 1 ? "" : "s"} across projects`;

  return (
    <PageWrapper
      title="All Work"
      subtitle={subtitleText}
      noInternalScroll
      contentClassName="!p-0"
    >
      <PmPageShell className="min-h-0 flex-1 gap-0 overflow-hidden" withGlow>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pt-2 sm:px-4">
          <PageTabsToolbar
            tabsDensity="icons"
            tabs={
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                <AllWorkViewSwitcher activeView={view} onViewChange={handleViewChangeWithReset} />
                <AllWorkViewsMenu activeView={view} hasActiveFilters={hasActiveFilters} />
                <button
                  type="button"
                  onClick={handleScopeToggle}
                  aria-label={
                    scopeMine
                      ? "Showing my tickets – click to show all"
                      : "Show only my tickets"
                  }
                  title={scopeMine ? "Showing my tickets" : "Show only my tickets"}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors duration-150",
                    scopeMine
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-input bg-card text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                </button>
              </div>
            }
            filters={
              <TicketFilterBar
                members={deduplicatedMembers}
                projectOptions={projectOptions}
                showTypeFilter
                showSprintFilter={false}
                showAssigneeFilter
              />
            }
          />

          {isLoading ? (
            <PmPanel solid className="mx-3 mb-2 mt-2 flex-1 overflow-auto sm:mx-4">
              <div className="py-2">
                <AllWorkSkeleton view={view} />
              </div>
            </PmPanel>
          ) : isError ? (
            <ErrorState
                  className={cn(PM_FILL_PANEL, "mx-3 mb-0 mt-2 sm:mx-4")}
                  title="Failed to load work items"
                  description="An error occurred while fetching tickets. Please try again."
                  onRetry={handleRetry}
                />
          ) : tickets.length === 0 ? (
            <EmptyState
                className={cn(PM_FILL_PANEL, "mx-3 mb-0 mt-2 sm:mx-4")}
                illustrationPreset="projects"
                title={hasActiveFilters ? "No tickets match your filters" : "No tickets yet"}
                description={
                  hasActiveFilters
                    ? "Try adjusting or clearing your filters."
                    : "Start by creating a ticket in any project."
                }
                action={
                  hasActiveFilters
                    ? { label: "Clear filters", onClick: handleClearFilters }
                    : { label: "All Projects", href: "/projects/all" }
                }
              />
          ) : (
            <>
              {tableSelection.size > 0 ? (
                <BulkActionBar
                  selectedCount={tableSelection.size}
                  members={deduplicatedMembers}
                  sprints={[]}
                  hideSprint
                  onBulkStatus={handleBulkStatus}
                  onBulkPriority={handleBulkPriority}
                  onBulkAssignee={handleBulkAssignee}
                  onBulkSprint={handleBulkSprintNoOp}
                  onClear={handleClearSelection}
                />
              ) : null}
              <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
                <div className="flex min-h-full flex-1 flex-col overscroll-contain">
                <AnimatePresence mode="wait" initial={false}>
                  {view === "list" ? (
                    <motion.div
                      key="list-view"
                      variants={swapVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pmSnappy}
                      className="pt-2 pb-0"
                    >
                      <AllWorkListSection groups={projectGroups} />
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
                      className="h-full w-full"
                    >
                      <AllWorkBoardSection groups={projectGroups} />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                </div>
              </ScrollArea>

              <PaginationFooter
                page={currentPage}
                limit={limit}
                total={total}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
