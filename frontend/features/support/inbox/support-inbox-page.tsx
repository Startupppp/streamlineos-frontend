"use client";

import { useState, useDeferredValue, useTransition, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSupportTickets, useSupportStats } from "@/hooks/api/support";
import { useAccess } from "@/hooks/api/access";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { SupportTicketStatus, SupportTicketPriority } from "@/types/support";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketList } from "@/features/support/inbox/ticket-list";
import { QueueViewRail } from "@/features/support/inbox/queue-view-rail";
import { useInboxShortcuts } from "@/features/support/inbox/use-inbox-shortcuts";
import { AgentAvailabilityToggle } from "@/features/support/inbox/agent-availability-toggle";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useShellVariant } from "@/components/layout/shell-variant-context";

function TicketDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading ticket" className="flex flex-1 min-h-0 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-2/3 rounded" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  );
}

function CreateTicketSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-lg border border-border bg-background p-6"
    >
      <Skeleton className="h-5 w-40 rounded" />
      <Skeleton className="h-10 w-full rounded" />
      <Skeleton className="h-10 w-full rounded" />
      <Skeleton className="h-24 w-full rounded" />
    </div>
  );
}

const TicketDetailWithAbly = dynamic(
  () =>
    import("@/features/support/inbox/ticket-detail-with-ably").then((m) => ({
      default: m.TicketDetailWithAbly,
    })),
  { ssr: false, loading: () => <TicketDetailSkeleton /> },
);

const CreateTicketDialog = dynamic(
  () =>
    import("@/features/support/inbox/create-ticket-dialog").then((m) => ({
      default: m.CreateTicketDialog,
    })),
  { ssr: false, loading: () => <CreateTicketSkeleton /> },
);

const TICKET_STATUSES: readonly SupportTicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];
const TICKET_PRIORITIES: readonly SupportTicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TICKET_PAGE_SIZE = 50;

function isTicketStatus(v: string): v is SupportTicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(v);
}

function isTicketPriority(v: string): v is SupportTicketPriority {
  return (TICKET_PRIORITIES as readonly string[]).includes(v);
}

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const shellVariant = useShellVariant();
  const isDesktopShell = shellVariant === "desktop";
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } = useQueryParamOpen("create");

  const statusFilter = searchParams.get("status") || "all";
  const priorityFilter = searchParams.get("priority") || "all";
  const queueIdFilter = searchParams.get("queueId");
  const assigneeIdFilter = searchParams.get("assigneeId");
  const channelFilter = searchParams.get("channel");
  const snoozedFilter = searchParams.get("snoozed") === "true";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") params.delete(key);
      else params.set(key, value);
      setPage(1);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname]
  );

  const ticketsResult = useSupportTickets({
    ...(isTicketStatus(statusFilter) ? { status: statusFilter } : {}),
    ...(isTicketPriority(priorityFilter) ? { priority: priorityFilter } : {}),
    ...(queueIdFilter ? { queueId: Number(queueIdFilter) } : {}),
    ...(assigneeIdFilter ? { assigneeId: assigneeIdFilter } : {}),
    ...(channelFilter ? { channel: channelFilter } : {}),
    ...(snoozedFilter ? { snoozed: true } : {}),
    page,
    limit: TICKET_PAGE_SIZE,
  });
  const { data: ticketsData, isError, refetch } = ticketsResult;
  const isLoading = ticketsResult.isLoading || ticketsResult.access.pending;
  const { data: stats, isLoading: statsLoading } = useSupportStats();
  const { data: accessData, isError: accessFailed, refetch: refetchAccess } = useAccess();

  const tickets = ticketsData?.items ?? [];
  const deferredTickets = useDeferredValue(tickets);

  const handleOpenCreate = useCallback(() => openCreate(), [openCreate]);
  useInboxShortcuts({
    tickets,
    selectedTicketId,
    onSelect: setSelectedTicketId,
    onCreateNew: handleOpenCreate,
  });
  const handleStatusFilter = useCallback(
    (v: string) => updateFilter("status", v),
    [updateFilter]
  );
  const handlePriorityFilter = useCallback(
    (v: string) => updateFilter("priority", v),
    [updateFilter]
  );
  const handleBackFromTicket = useCallback(() => setSelectedTicketId(null), []);

  const handlePageChange = useCallback((nextPage: number) => {
    setSelectedTicketId(null);
    setPage(nextPage);
  }, []);

  const handleToggleSnoozed = useCallback(
    () => updateFilter("snoozed", snoozedFilter ? "all" : "true"),
    [updateFilter, snoozedFilter],
  );

  const handleSelectQueue = useCallback(
    (queueId: number | null) => updateFilter("queueId", queueId ? String(queueId) : "all"),
    [updateFilter],
  );

  const handleApplyView = useCallback(
    (filter: Record<string, unknown>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (typeof filter.status === "string" && isTicketStatus(filter.status)) {
        params.set("status", filter.status);
      }
      if (typeof filter.priority === "string" && isTicketPriority(filter.priority)) {
        params.set("priority", filter.priority);
      }
      setPage(1);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  function handleRetry() {
    void refetch();
  }

  function handleAccessRetry() {
    void refetchAccess();
  }

  if (accessFailed && !accessData) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't check your access"
        description="Your permissions couldn't be loaded. Please try again."
        onRetry={handleAccessRetry}
      />
    );
  }

  return (
    <>
      <PageWrapper
        title="Support Inbox"
        subtitle={
          statsLoading
            ? "Loading..."
            : `${(stats?.open ?? 0) + (stats?.in_progress ?? 0)} active tickets${
                (stats?.sla_breached ?? 0) > 0
                  ? ` · ${stats?.sla_breached} SLA breached`
                  : ""
              }`
        }
        actions={
          <div className="flex items-center gap-2">
            <AgentAvailabilityToggle />
            <AnimatedIconButton onClick={handleOpenCreate} size="sm" icon={PlusIcon} iconClassName="mr-1.5">
              New Ticket
            </AnimatedIconButton>
          </div>
        }
        filters={
          <>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-full sm:w-32`}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={handlePriorityFilter}>
              <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-full sm:w-28`}>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        noInternalScroll
        contentClassName="flex overflow-hidden !py-0 !px-0"
      >
        {isDesktopShell && (
          <div className={cn("hidden md:flex", selectedTicketId && "md:flex")}>
            <QueueViewRail
              activeQueueId={queueIdFilter ? Number(queueIdFilter) : null}
              onSelectQueue={handleSelectQueue}
              onApplyView={handleApplyView}
              snoozedActive={snoozedFilter}
              onToggleSnoozed={handleToggleSnoozed}
            />
          </div>
        )}

        {isError ? (
          <div className="flex-1 flex items-center justify-center">
            <ErrorState
              title="Failed to load tickets"
              description="We couldn't load your support tickets. Please try again."
              onRetry={handleRetry}
              compact
            />
          </div>
        ) : ticketsResult.access.denied ? (
          <div className="flex-1 flex items-center justify-center">
            <NoPermissionState permission="support:tickets:view" compact />
          </div>
        ) : (
          <TicketList
            tickets={deferredTickets}
            isLoading={isLoading}
            selectedTicketId={selectedTicketId}
            onSelect={setSelectedTicketId}
            page={page}
            pageSize={TICKET_PAGE_SIZE}
            total={ticketsData?.total ?? 0}
            onPageChange={handlePageChange}
          />
        )}

        <div className={cn("flex-1 flex flex-col", !selectedTicketId && "hidden md:flex")}>
          {selectedTicketId ? (
            <TicketDetailWithAbly ticketId={selectedTicketId} onBack={handleBackFromTicket} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <div>
                <EmptyTicketIllustration className="mx-auto mb-3 w-40 h-40" />
                <p className="text-sm font-medium text-foreground">Select a ticket</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a ticket from the list to view its details
                </p>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>

      {createOpen && <CreateTicketDialog open onOpenChange={setCreateOpen} />}
    </>
  );
}

export function SupportInboxPage() {
  return <InboxContent />;
}
