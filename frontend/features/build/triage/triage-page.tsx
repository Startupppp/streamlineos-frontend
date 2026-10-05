"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useProject } from "@/hooks/api/build/projects";
import { useCycles } from "@/hooks/api/build/cycles";
import { useTickets } from "@/hooks/api/build/tickets";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useCan } from "@/hooks/api/access";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  CONTENT_FILL_PANEL,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import { TriageRow } from "./triage-row";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { TablePagination } from "@/components/ui/table-pagination";
import { TriagePageLoading } from "./triage-page-loading";
import { useTriageTicketActions } from "./use-triage-ticket-actions";
import { useTriageBulkActions } from "./use-triage-bulk-actions";
import { useTriageKeyboard } from "./use-triage-keyboard";

const PAGE_LIMIT = 50;
const TRIAGE_STATUS = "TODO";
const TRIAGE_SORT_OPTIONS = [
  "created",
  "updated",
  "priority",
  "dueDate",
  "rank",
] as const;

interface TriagePageProps {
  projectId: number;
}

export function TriagePage({ projectId }: TriagePageProps) {
  const listFilters = useBuildListFilters({
    filters: [
      { param: "status" },
      { param: "ownerId" },
      { param: "sort", options: TRIAGE_SORT_OPTIONS, all: "created" },
    ],
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [storedTrail, setStoredTrail] = useState<(string | null)[]>([null]);
  const canUpdate = useCan("build:tickets:update");
  const { data: membersPage } = useProjectMembers(projectId);
  const members = membersPage?.data ?? [];
  const { data: cycles } = useCycles(projectId);
  const cursorTrail = useMemo(
    () =>
      storedTrail[storedTrail.length - 1] === listFilters.cursor
        ? storedTrail
        : [listFilters.cursor],
    [listFilters.cursor, storedTrail],
  );
  const cursor = cursorTrail[cursorTrail.length - 1] ?? undefined;
  const hasPrevious = cursorTrail.length > 1;
  const ownerValue = listFilters.value("ownerId");
  const triageOwner = ownerValue !== BUILD_FILTER_ALL ? ownerValue : undefined;
  const sortValue = listFilters.value("sort");
  const triageSort =
    TRIAGE_SORT_OPTIONS.find((option) => option === sortValue) ?? "created";
  const urlStatus = listFilters.value("status");
  const triageStatus =
    urlStatus === BUILD_FILTER_ALL ? TRIAGE_STATUS : urlStatus;
  const {
    data: ticketPage,
    isLoading: ticketsLoading,
    isError,
    error,
    refetch,
  } = useTickets(projectId, {
    search: listFilters.debouncedSearch || undefined,
    cursor,
    status: triageStatus,
    limit: PAGE_LIMIT,
    orderBy: triageSort,
    orderDir: "asc",
    assigneeId: triageOwner,
  });
  const { data: project, isLoading: projectLoading } = useProject(projectId);

  const isLoading = projectLoading || ticketsLoading;
  const tickets = useMemo(
    () =>
      (ticketPage?.data ?? []).filter(
        (t) => t.type !== "EPIC" && t.cycleId === null,
      ),
    [ticketPage?.data],
  );
  const visibleCount = tickets.length;
  const hasMore = ticketPage?.pagination.hasMore ?? false;

  const handleNextPage = useCallback(
    (nextCursor: string | null | undefined) => {
      if (!nextCursor) return;
      setStoredTrail([...cursorTrail, nextCursor]);
      listFilters.setCursor(nextCursor);
    },
    [cursorTrail, listFilters],
  );

  const handlePreviousPage = useCallback(() => {
    if (cursorTrail.length <= 1) return;
    const nextTrail = cursorTrail.slice(0, -1);
    setStoredTrail(nextTrail);
    listFilters.setCursor(nextTrail[nextTrail.length - 1] ?? null);
  }, [cursorTrail, listFilters]);

  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading,
    isError,
    error,
  });

  const isReady = pageState.kind === "ready";

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const { handleAccept, handleDecline, handleOpen, pendingAccept, pendingDecline, updateTicket } =
    useTriageTicketActions({ projectId, tickets, project });

  const { selectedIds, handleToggleSelect, handleClearSelection, handleBulkStatus, handleBulkPriority, handleBulkAssignee, handleBulkCycle } =
    useTriageBulkActions({ projectId });

  const handleOpenTicketByIndex = useCallback(
    (index: number) => {
      const ticket = tickets[index];
      if (ticket) handleOpen(ticket);
    },
    [tickets, handleOpen],
  );

  const { focusedIndex: triageFocusedIndex } = useBuildListKeyboard({
    itemCount: tickets.length,
    onOpen: handleOpenTicketByIndex,
    onClearSelection: handleClearSelection,
    enabled: isReady,
    searchInputRef,
  });

  useTriageKeyboard({
    isReady,
    canUpdate,
    triageFocusedIndex,
    tickets,
    handleAccept,
    handleDecline,
    isPending: updateTicket.isPending,
    pendingAccept,
    pendingDecline,
  });

  return (
    <PageWrapper
      title="Triage"
      subtitle={
        isReady && visibleCount > 0
          ? `${visibleCount}${hasMore ? "+" : ""} issue${visibleCount !== 1 ? "s" : ""} awaiting triage`
          : "Review and process incoming issues"
      }
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search triage",
            inputRef: searchInputRef,
          }}
          onClearAll={listFilters.clearAll}
        />
      }
    >
      <PageState
        resolution={pageState}
        loading={<TriagePageLoading />}
        onRetry={handleRetry}
        className={CONTENT_FILL_PANEL}
      >
        <PmPageShell>
          {tickets.length === 0 ? (
            <PmSection index={0} className={PM_FILL_SECTION}>
              <EmptyState
                illustrationPreset="tasks"
                title={
                  listFilters.isFiltered
                    ? "No results match your filters"
                    : "Nothing to triage"
                }
                description={
                  listFilters.isFiltered
                    ? "Try adjusting the filters to find triage issues."
                    : "All issues have been processed. New issues added to the backlog will appear here."
                }
                filtersActive={listFilters.isFiltered}
                filteredTitle="No results match your filters"
                onClearFilters={
                  listFilters.isFiltered ? listFilters.clearAll : undefined
                }
                className={CONTENT_FILL_PANEL}
              />
            </PmSection>
          ) : (
            <PmSection index={0} className={PM_FILL_SECTION}>
              {canUpdate && selectedIds.size > 0 && (
                <BulkActionBar
                  selectedCount={selectedIds.size}
                  members={members}
                  cycles={cycles ?? []}
                  statuses={project?.statuses}
                  onBulkStatus={handleBulkStatus}
                  onBulkPriority={handleBulkPriority}
                  onBulkAssignee={handleBulkAssignee}
                  onBulkCycle={handleBulkCycle}
                  onClear={handleClearSelection}
                />
              )}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PmStaggerList className="flex flex-col gap-2.5">
                  {tickets.map((ticket, index) => (
                    <div key={ticket.id} className="flex items-start gap-2">
                      {canUpdate && (
                        <Checkbox
                          className="mt-4 shrink-0"
                          checked={selectedIds.has(ticket.id)}
                          onCheckedChange={() => handleToggleSelect(ticket.id)}
                          aria-label={`Select ticket ${ticket.ticketNumber}`}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <TriageRow
                          ticket={ticket}
                          projectKey={project?.key}
                          isAccepting={pendingAccept.has(ticket.id)}
                          isDeclining={pendingDecline.has(ticket.id)}
                          onAccept={handleAccept}
                          onDecline={handleDecline}
                          onOpen={handleOpen}
                          isSelected={triageFocusedIndex === index}
                        />
                      </div>
                    </div>
                  ))}
                </PmStaggerList>
              </div>
              <TablePagination
                mode="cursor"
                rowCount={tickets.length}
                pageNumber={cursorTrail.length}
                hasMore={hasMore}
                hasPrevious={hasPrevious}
                onNext={() => handleNextPage(ticketPage?.pagination.nextCursor)}
                onPrevious={handlePreviousPage}
              />
            </PmSection>
          )}
        </PmPageShell>
      </PageState>
    </PageWrapper>
  );
}
