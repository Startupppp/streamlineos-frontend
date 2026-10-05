"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProject } from "@/hooks/api/build/projects";
import { useCycles } from "@/hooks/api/build/advanced";
import { useTickets, useUpdateTicket, useBulkUpdateTickets } from "@/hooks/api/build/tickets";
import type { BulkUpdateTicketsInput } from "@/hooks/api/build/tickets";
import { removeTicketFromCollections } from "@/hooks/api/build/ticket-cache";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useCan } from "@/hooks/api/access";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { Ticket } from "@/types/projects";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { TablePagination } from "@/components/ui/table-pagination";
import { toBulkPriority } from "@/features/build/shared/bulk-priority";

const TRIAGE_STATUS = "TODO";
const ACCEPT_STATUS = "IN_PROGRESS";
const DECLINE_STATUS = "CANCELLED";
const PAGE_LIMIT = 50;

function TriagePageLoading() {
  return (
    <PmPageShell>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </PmPageShell>
  );
}

interface TriagePageProps {
  projectId: number;
}

export function TriagePage({ projectId }: TriagePageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestLeave = useNavigationLeave();
  const listFilters = useBuildListFilters({
    filters: [{ param: "status" }],
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [storedTrail, setStoredTrail] = useState<(string | null)[]>([null]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const canUpdate = useCan("build:tickets:update");
  const bulkUpdate = useBulkUpdateTickets(projectId);
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
    sortValue === "created" || sortValue === "updated" || sortValue === "priority" || sortValue === "dueDate" || sortValue === "rank"
      ? sortValue
      : "created";
  const urlStatus = listFilters.value("status");
  const triageStatus = urlStatus === BUILD_FILTER_ALL ? TRIAGE_STATUS : urlStatus;
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

  const updateTicket = useUpdateTicket(projectId);
  const [pendingAccept, setPendingAccept] = useState<Set<number>>(new Set());
  const [pendingDecline, setPendingDecline] = useState<Set<number>>(new Set());

  const isLoading = projectLoading || ticketsLoading;
  const tickets = useMemo(
    () => (ticketPage?.data ?? []).filter((t) => t.type !== "EPIC" && t.cycleId === null),
    [ticketPage?.data],
  );
  const visibleCount = tickets.length;
  const hasMore = ticketPage?.pagination.hasMore ?? false;

  const handleNextPage = useCallback((nextCursor: string | null | undefined) => {
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

  const handleAccept = useCallback(
    (ticketId: number) => {
      const target = tickets.find((t) => t.id === ticketId);
      if (!target) return;
      setPendingAccept((prev) => new Set(prev).add(ticketId));
      updateTicket.mutate(
        { ticketId, version: target.version, status: ACCEPT_STATUS },
        {
          onSuccess: () => {
            setPendingAccept((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            removeTicketFromCollections(queryClient, projectId, ticketId);
            toast.success("Ticket moved to In Progress");
          },
          onError: (err) => {
            setPendingAccept((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            toast.error(getErrorMessage(err));
          },
        },
      );
    },
    [updateTicket, queryClient, projectId, tickets],
  );

  const handleDecline = useCallback(
    (ticketId: number) => {
      const target = tickets.find((t) => t.id === ticketId);
      if (!target) return;
      setPendingDecline((prev) => new Set(prev).add(ticketId));
      updateTicket.mutate(
        { ticketId, version: target.version, status: DECLINE_STATUS },
        {
          onSuccess: () => {
            setPendingDecline((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            removeTicketFromCollections(queryClient, projectId, ticketId);
            toast.success("Ticket declined");
          },
          onError: (err) => {
            setPendingDecline((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
            toast.error(getErrorMessage(err));
          },
        },
      );
    },
    [updateTicket, queryClient, projectId, tickets],
  );

  const handleOpen = useCallback(
    (ticket: Ticket) => {
      const href = getTicketDetailHref(
        projectId,
        project?.key,
        ticket.ticketNumber,
      );
      requestLeave(() => router.push(href));
    },
    [router, projectId, project?.key, requestLeave],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenTicketByIndex = useCallback(
    (index: number) => {
      const ticket = tickets[index];
      if (ticket) handleOpen(ticket);
    },
    [tickets, handleOpen],
  );
  const handleClearTriageKeyboard = useCallback(() => setSelectedIds(new Set()), []);
  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  const handleBulkUpdate = useCallback(
    (update: Partial<Pick<BulkUpdateTicketsInput, "status" | "priority" | "assigneeId" | "cycleId">>) =>
      bulkUpdate.mutate({ ticketIds: [...selectedIds], ...update }, { onSuccess: () => { setSelectedIds(new Set()); toast.success("Updated"); }, onError: (e) => toast.error(getErrorMessage(e)) }),
    [bulkUpdate, selectedIds],
  );
  const handleBulkStatus = useCallback((v: string) => handleBulkUpdate({ status: v }), [handleBulkUpdate]);
  const handleBulkPriority = useCallback((v: string) => { const p = toBulkPriority(v); if (p) handleBulkUpdate({ priority: p }); }, [handleBulkUpdate]);
  const handleBulkAssignee = useCallback((v: string) => handleBulkUpdate({ assigneeId: v || undefined }), [handleBulkUpdate]);
  const handleBulkCycle = useCallback((v: string) => handleBulkUpdate({ cycleId: parseInt(v) || null }), [handleBulkUpdate]);
  const { focusedIndex: triageFocusedIndex } = useBuildListKeyboard({
    itemCount: tickets.length,
    onOpen: handleOpenTicketByIndex,
    onClearSelection: handleClearTriageKeyboard,
    enabled: isReady,
    searchInputRef,
  });

  useEffect(() => {
    if (!isReady || !canUpdate) return;
    let shortcutPending = false;
    function handleTriageKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
          e.target.isContentEditable || e.target.closest('[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]')) return;
      }
      if (shortcutPending || updateTicket.isPending || pendingAccept.size > 0 || pendingDecline.size > 0) return;
      if (triageFocusedIndex === null || triageFocusedIndex === undefined) return;
      const focused = tickets[triageFocusedIndex];
      if (!focused) return;
      if (e.key === "a") {
        e.preventDefault();
        shortcutPending = true;
        handleAccept(focused.id);
      } else if (e.key === "d") {
        e.preventDefault();
        shortcutPending = true;
        handleDecline(focused.id);
      }
    }
    document.addEventListener("keydown", handleTriageKeyDown);
    return () => document.removeEventListener("keydown", handleTriageKeyDown);
  }, [isReady, canUpdate, triageFocusedIndex, tickets, handleAccept, handleDecline, updateTicket.isPending, pendingAccept, pendingDecline]);

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
                title={listFilters.isFiltered ? "No results match your filters" : "Nothing to triage"}
                description={listFilters.isFiltered ? "Try adjusting the filters to find triage issues." : "All issues have been processed. New issues added to the backlog will appear here."}
                filtersActive={listFilters.isFiltered}
                filteredTitle="No results match your filters"
                onClearFilters={listFilters.isFiltered ? listFilters.clearAll : undefined}
                className={CONTENT_FILL_PANEL}
              />
            </PmSection>
          ) : (
            <PmSection index={0} className={PM_FILL_SECTION}>
              {canUpdate && selectedIds.size > 0 && (
                <BulkActionBar selectedCount={selectedIds.size} members={members} cycles={cycles ?? []} statuses={project?.statuses} onBulkStatus={handleBulkStatus} onBulkPriority={handleBulkPriority} onBulkAssignee={handleBulkAssignee} onBulkCycle={handleBulkCycle} onClear={handleClearTriageKeyboard} />
              )}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PmStaggerList className="flex flex-col gap-2.5">
                  {tickets.map((ticket, index) => (
                    <div key={ticket.id} className="flex items-start gap-2">
                      {canUpdate && (
                        <Checkbox className="mt-4 shrink-0" checked={selectedIds.has(ticket.id)} onCheckedChange={() => handleToggleSelect(ticket.id)} aria-label={`Select ticket ${ticket.ticketNumber}`} />
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
