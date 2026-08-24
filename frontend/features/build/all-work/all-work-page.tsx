"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UserIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { BulkActionBar } from "@/features/build/backlog/bulk-action-bar";
import { TicketFilterBar } from "@/features/build/shared/ticket-filter-bar";
import { useAllWork, useProjects } from "@/hooks/api/build";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/build/shared/pm-chrome";
import {
  pmSnappy,
  viewSwap,
  viewSwapReduced,
} from "@/lib/motion-presets";
import { groupByProject } from "./all-work-ticket-utils";
import { getTicketDetailHref } from "@/features/build/shared/format-ticket-key";
import { AllWorkViewSwitcher, AllWorkSkeleton } from "./all-work-view-switcher";
import { AllWorkListSection } from "./all-work-list-section";
import { AllWorkTableSection } from "./all-work-table-section";
import { AllWorkBoardSection } from "./all-work-board-section";
import { AllWorkViewsMenu } from "./all-work-views-menu";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAllWorkFilters } from "./use-all-work-filters";
import { useAllWorkBulk } from "./use-all-work-bulk";

interface AllWorkPageProps {
  pmWorkspaceId?: string;
}

export function AllWorkPage({ pmWorkspaceId }: AllWorkPageProps) {
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

  const workspaceFilters: typeof filters = pmWorkspaceId ? { ...filters, pmWorkspaceId } : filters;
  const { data: allWorkData, isLoading, isError, refetch } = useAllWork(workspaceFilters);
  const { data: projectsData } = useProjects({ limit: 100, ...(pmWorkspaceId ? { pmWorkspaceId } : {}) });

  const tickets = useMemo(() => allWorkData?.data ?? [], [allWorkData]);
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
    ? "Loading tickets…"
    : `${total} ticket${total === 1 ? "" : "s"} across projects`;

  return (
    <PageWrapper
      title="All Work"
      subtitle={subtitleText}
      noInternalScroll
      contentClassName="!p-0"
    >
      <PmPageShell className="min-h-0 flex-1 gap-0 overflow-hidden" withGlow>
        <PmSection
          index={0}
          className={cn(
            PAGE_CHROME_X,
            "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden",
          )}
        >
          <PageTabsToolbar
            tabsDensity="icons"
            tabs={
              <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide sm:gap-2 [&>*]:shrink-0">
                <AllWorkViewSwitcher activeView={view} onViewChange={handleViewChangeWithReset} />
                <AllWorkViewsMenu activeView={view} hasActiveFilters={hasActiveFilters} />
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
                showSprintFilter={false}
                showAssigneeFilter
              />
            }
          />

          {isLoading ? (
            <PmPanel solid className="mb-2 mt-2 flex-1 overflow-auto">
              <div className="py-2">
                <AllWorkSkeleton view={view} />
              </div>
            </PmPanel>
          ) : isError ? (
            <ErrorState
                  className={cn(PM_FILL_PANEL, "mb-0 mt-2")}
                  title="Failed to load work items"
                  description="An error occurred while fetching tickets. Please try again."
                  onRetry={handleRetry}
                />
          ) : tickets.length === 0 ? (
            <EmptyState
                className={cn(PM_FILL_PANEL, "mb-0 mt-2")}
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
                    : { label: "All Projects", href: "/build/all" }
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
                        className="flex h-full min-h-0 w-full flex-1 flex-col"
                      >
                        <AllWorkBoardSection groups={projectGroups} />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  </div>
                </ScrollArea>

                <TablePagination
                  page={currentPage}
                  pageSize={limit}
                  total={total}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
