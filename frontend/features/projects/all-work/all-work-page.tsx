"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { User } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { BulkActionBar } from "@/features/projects/backlog/bulk-action-bar";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { useAllWork, useProjects } from "@/hooks/api/projects";
import { cn } from "@/lib/utils";
import { groupByProject } from "./all-work-ticket-utils";
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
  const { data: projectsData } = useProjects({ limit: 100 } as Record<string, unknown>);

  const tickets = allWorkData?.data ?? [];
  const total = allWorkData?.total ?? 0;
  const currentPage = allWorkData?.page ?? page;
  const limit = allWorkData?.limit ?? 50;

  const projectGroups = useMemo(() => groupByProject(tickets), [tickets]);

  const allProjects = useMemo(() => projectsData?.data ?? [], [projectsData]);

  const projectOptions = useMemo(
    () => allProjects.map((p) => ({ id: p.id, name: p.name, key: p.key })),
    [allProjects]
  );

  const deduplicatedMembers = useMemo(
    () =>
      allProjects
        .flatMap((p) => p.members)
        .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
        .map((m) => ({
          id: m.id,
          name: null as string | null,
          firstName: m.firstName,
          lastName: m.lastName,
          image: m.image,
        })),
    [allProjects]
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
      if (ticket) {
        router.push(`/projects/${ticket.projectId}?ticket=${ticketId}`);
      }
    },
    [tickets, router]
  );

  const handleViewChangeWithReset = useCallback(
    (v: Parameters<typeof handleViewChange>[0]) => {
      handleViewChange(v, () => setTableSelection(new Set()));
    },
    [handleViewChange, setTableSelection]
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const subtitleText = isLoading
    ? "Loading..."
    : `${total} ticket${total === 1 ? "" : "s"}`;

  return (
    <PageWrapper
      title="All Work"
      subtitle={subtitleText}
      eyebrow="Projects"
      noInternalScroll
      contentClassName="!p-0"
      filters={
        <div className="flex min-h-8 w-full flex-wrap items-center gap-2 sm:gap-3">
          <AllWorkViewSwitcher activeView={view} onViewChange={handleViewChangeWithReset} />

          <AllWorkViewsMenu activeView={view} hasActiveFilters={hasActiveFilters} />

          <button
            type="button"
            onClick={handleScopeToggle}
            aria-label={scopeMine ? "Showing my tickets – click to show all" : "Show only my tickets"}
            title={scopeMine ? "Showing my tickets" : "Show only my tickets"}
            className={cn(
              "h-8 w-8 rounded-md border flex items-center justify-center shrink-0 transition-colors",
              scopeMine
                ? "bg-blue-500 border-blue-500 text-white"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-3.5 w-3.5" />
          </button>

          <TicketFilterBar
            members={deduplicatedMembers}
            projectOptions={projectOptions}
            showTypeFilter
            showSprintFilter={false}
            showAssigneeFilter
          />
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 overflow-auto">
            <AllWorkSkeleton view={view} />
          </div>
        ) : isError ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <ErrorState
              title="Failed to load work items"
              description="An error occurred while fetching tickets. Please try again."
              onRetry={handleRetry}
            />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
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
          </div>
        ) : (
          <>
            {tableSelection.size > 0 && (
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
            )}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {view === "list" && (
                <motion.div
                  key="list-view"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="py-2"
                >
                  <AllWorkListSection groups={projectGroups} />
                </motion.div>
              )}

              {view === "table" && (
                <motion.div
                  key="table-view"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <AllWorkTableSection
                    tickets={tickets}
                    tableSelection={tableSelection}
                    onSelectionChange={setTableSelection}
                    onTicketClick={handleTicketClickForTable}
                  />
                </motion.div>
              )}

              {view === "board" && (
                <motion.div
                  key="board-view"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="h-full w-full"
                >
                  <AllWorkBoardSection groups={projectGroups} />
                </motion.div>
              )}
            </div>

            <PaginationFooter
              page={currentPage}
              limit={limit}
              total={total}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </PageWrapper>
  );
}
