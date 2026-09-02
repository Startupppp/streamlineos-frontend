"use client";

import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSupportTickets, useSupportStats } from "@/hooks/api/support";
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
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { SupportTicketStatus, SupportTicketPriority } from "@/types/support";
import { ErrorState } from "@/components/shared/error-state";
import { TicketList } from "@/features/support/inbox/ticket-list";
import { TicketDetailSheet } from "@/features/support/inbox/ticket-detail-sheet";
import { CreateTicketDialog } from "@/features/support/inbox/create-ticket-dialog";
import { QueueViewRail } from "@/features/support/inbox/queue-view-rail";
import { SupportAblyProvider } from "@/features/support/inbox/support-ably-provider";
import { useInboxShortcuts } from "@/features/support/inbox/use-inbox-shortcuts";
import { AgentAvailabilityToggle } from "@/features/support/inbox/agent-availability-toggle";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";

const TICKET_STATUSES: readonly SupportTicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];
const TICKET_PRIORITIES: readonly SupportTicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

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
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
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
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname]
  );

  const { data: ticketsData, isLoading, isError, refetch } = useSupportTickets({
    ...(isTicketStatus(statusFilter) ? { status: statusFilter } : {}),
    ...(isTicketPriority(priorityFilter) ? { priority: priorityFilter } : {}),
    ...(queueIdFilter ? { queueId: Number(queueIdFilter) } : {}),
    ...(assigneeIdFilter ? { assigneeId: assigneeIdFilter } : {}),
    ...(channelFilter ? { channel: channelFilter } : {}),
    ...(snoozedFilter ? { snoozed: true } : {}),
  });
  const { data: stats, isLoading: statsLoading } = useSupportStats();

  const tickets = ticketsData?.items ?? [];

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
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  function handleRetry() {
    void refetch();
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
        <div className={cn("hidden md:flex", selectedTicketId && "md:flex")}>
          <QueueViewRail
            activeQueueId={queueIdFilter ? Number(queueIdFilter) : null}
            onSelectQueue={handleSelectQueue}
            onApplyView={handleApplyView}
            snoozedActive={snoozedFilter}
            onToggleSnoozed={handleToggleSnoozed}
          />
        </div>

        {isError ? (
          <div className="flex-1 flex items-center justify-center">
            <ErrorState
              title="Failed to load tickets"
              description="We couldn't load your support tickets. Please try again."
              onRetry={handleRetry}
              compact
            />
          </div>
        ) : (
          <TicketList
            tickets={tickets}
            isLoading={isLoading}
            selectedTicketId={selectedTicketId}
            onSelect={setSelectedTicketId}
          />
        )}

        <div className={cn("flex-1 flex flex-col", !selectedTicketId && "hidden md:flex")}>
          {selectedTicketId ? (
            <TicketDetailSheet ticketId={selectedTicketId} onBack={handleBackFromTicket} />
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

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

export function SupportInboxPage() {
  return (
    <DashboardGate permission="dashboard:support:view">
      <SupportAblyProvider>
        <InboxContent />
      </SupportAblyProvider>
    </DashboardGate>
  );
}
