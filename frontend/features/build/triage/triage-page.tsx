"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useProject, useTickets, useUpdateTicket } from "@/hooks/api";
import { useBulkUpdateTickets } from "@/hooks/api/build";
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
} from "@/components/pm-chrome";
import { TriageRow } from "./triage-row";
import type { Ticket } from "@/types/projects";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { TablePagination } from "@/components/ui/table-pagination";

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
  const requestLeave = useNavigationLeave();
  const listFilters = useBuildListFilters();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [storedTrail, setStoredTrail] = useState<(string | null)[]>([null]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const canUpdate = useCan("build:tickets:update");
  const bulkUpdate = useBulkUpdateTickets(projectId);
  const cursorTrail = useMemo(
    () =>
      storedTrail[storedTrail.length - 1] === listFilters.cursor
        ? storedTrail
        : [listFilters.cursor],
    [listFilters.cursor, storedTrail],
  );
  const cursor = cursorTrail[cursorTrail.length - 1] ?? undefined;
  const hasPrevious = cursorTrail.length > 1;
  const triageOwner = listFilters.value("ownerId") || undefined;
  const triageSort = (listFilters.value("sort") as "created" | "updated" | "priority" | "dueDate" | undefined) || "created";
  const {
    data: ticketPage,
    isLoading: ticketsLoading,
    isError,
    error,
    refetch,
  } = useTickets(projectId, {
    search: listFilters.debouncedSearch || undefined,
    cursor,
    status: TRIAGE_STATUS,
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
  const tickets = useMemo(() => ticketPage?.data ?? [], [ticketPage?.data]);
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
      setPendingAccept((prev) => new Set(prev).add(ticketId));
      updateTicket.mutate(
        { ticketId, status: ACCEPT_STATUS },
        {
          onSuccess: () => {
            setPendingAccept((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
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
    [updateTicket],
  );

  const handleDecline = useCallback(
    (ticketId: number) => {
      setPendingDecline((prev) => new Set(prev).add(ticketId));
      updateTicket.mutate(
        { ticketId, status: DECLINE_STATUS },
        {
          onSuccess: () => {
            setPendingDecline((prev) => {
              const next = new Set(prev);
              next.delete(ticketId);
              return next;
            });
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
    [updateTicket],
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
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const handleBulkStatus = useCallback((status: string) => {
    bulkUpdate.mutate(
      { ticketIds: [...selectedIds], status },
      { onSuccess: () => { setSelectedIds(new Set()); toast.success("Updated"); }, onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [bulkUpdate, selectedIds]);
  const { focusedIndex: triageFocusedIndex } = useBuildListKeyboard({
    itemCount: tickets.length,
    onOpen: handleOpenTicketByIndex,
    onClearSelection: handleClearTriageKeyboard,
    enabled: isReady,
    searchInputRef,
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
        className="flex-1"
      >
        <PmPageShell>
          {tickets.length === 0 ? (
            <EmptyState
              illustrationPreset="tasks"
              title="Nothing to triage"
              description="All issues have been processed. New issues added to the backlog will appear here."
              className="flex-1"
              compact={false}
            />
          ) : (
            <PmSection index={0}>
              {canUpdate && selectedIds.size > 0 && (
                <BulkActionBar selectedCount={selectedIds.size} members={[]} cycles={[]} statuses={project?.statuses} onBulkStatus={handleBulkStatus} onBulkPriority={handleBulkStatus} onBulkAssignee={handleBulkStatus} onBulkCycle={handleBulkStatus} onClear={handleClearTriageKeyboard} />
              )}
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
              <TablePagination
                mode="cursor"
                rowCount={tickets.length}
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
