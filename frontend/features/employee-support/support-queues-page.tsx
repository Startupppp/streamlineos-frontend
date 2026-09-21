"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SettingsIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/search-input";
import { useCursorPager } from "@/components/ui/table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useSupportQueues, useSupportQueueTickets } from "@/hooks/api/hr/helpdesk";
import type { HelpdeskQueueSummary, HelpdeskTicket, TicketStatus } from "@/hooks/api/hr/helpdesk-schema";
import {
  SUPPORT_QUEUES,
  SUPPORT_QUEUE_LABELS,
  isSupportQueue,
  type SupportQueue,
} from "@/lib/employee-support";
import { cn } from "@/lib/utils";
import { REQUEST_STATUS_LABELS } from "./support-request-badges";
import { QUEUE_REQUEST_COLUMNS, requestRowKey } from "./support-request-columns";
import { SupportRequestsTableSkeleton } from "./support-requests-table-skeleton";
import { SupportRequestDetailSheet } from "./support-request-detail-sheet";
import { SupportQueueSettingsSheet } from "./support-queue-settings-sheet";

const PAGE_SIZE = 25;
const STATUSES: readonly TicketStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

function readStatus(value: string | null): TicketStatus | undefined {
  return STATUSES.find((status) => status === value);
}

function readTicketId(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function defaultQueue(membership: Record<SupportQueue, boolean>): SupportQueue {
  if (membership.HR) return "HR";
  return SUPPORT_QUEUES.find((queue) => membership[queue]) ?? "HR";
}

export function QueueTabLabel({
  queue,
  summary,
  isMember,
}: {
  queue: SupportQueue;
  summary: HelpdeskQueueSummary | undefined;
  isMember: boolean;
}) {
  const open = summary?.openCount ?? null;
  const overdue = summary?.overdueCount ?? null;
  return (
    <span className="flex items-center gap-1.5">
      <span>{SUPPORT_QUEUE_LABELS[queue]}</span>
      {isMember && open !== null ? (
        <span className="rounded-full bg-primary/10 px-1.5 text-micro font-medium tabular-nums">{open}</span>
      ) : null}
      {isMember && overdue !== null && overdue > 0 ? (
        <span
          className="rounded-full bg-status-danger-surface px-1.5 text-micro font-medium tabular-nums text-status-danger-ink"
          aria-label={`${overdue} overdue`}
        >
          {overdue}
        </span>
      ) : null}
      {!isMember ? <span className="text-micro text-muted-foreground">read only</span> : null}
    </span>
  );
}

export function SupportQueuesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canManage = useCan("hr:helpdesk:manage");
  const membership: Record<SupportQueue, boolean> = {
    HR: useCan("hr:helpdesk:queue-hr") || canManage,
    IT: useCan("hr:helpdesk:queue-it") || canManage,
    FINANCE: useCan("hr:helpdesk:queue-finance") || canManage,
    ADMIN: useCan("hr:helpdesk:queue-admin") || canManage,
    LEGAL: useCan("hr:helpdesk:queue-legal") || canManage,
  };

  const queueParam = searchParams.get("queue");
  const queue: SupportQueue = isSupportQueue(queueParam) ? queueParam : defaultQueue(membership);
  const status = readStatus(searchParams.get("status"));
  const selectedTicketId = readTicketId(searchParams.get("ticket"));
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pager = useCursorPager(`${queue}|${status ?? "all"}|${debouncedSearch}`);
  const query = useSupportQueueTickets({
    limit: PAGE_SIZE,
    cursor: pager.cursor,
    queue,
    status,
    q: debouncedSearch.length > 0 ? debouncedSearch : undefined,
  });
  const queues = useSupportQueues();
  const summaries = new Map((queues.data ?? []).map((summary) => [summary.queue, summary]));
  const rows: HelpdeskTicket[] = query.data?.data ?? [];
  const filtersActive = status !== undefined || debouncedSearch.length > 0;

  const pageState = usePageState({
    permission: "hr:helpdesk:view",
    module: "hr",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: query.isSuccess && rows.length === 0 && !pager.hasPrevious,
  });

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  function handleQueueChange(value: string) {
    if (!isSupportQueue(value)) return;
    replaceParams((params) => {
      params.set("queue", value);
      params.delete("ticket");
    });
  }

  function handleStatusChange(value: string) {
    replaceParams((params) => {
      if (value === "all") params.delete("status");
      else params.set("status", value);
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    replaceParams((params) => {
      if (value) params.set("q", value);
      else params.delete("q");
    });
  }

  function handleClearFilters() {
    setSearch("");
    replaceParams((params) => {
      params.delete("status");
      params.delete("q");
    });
  }

  function handleRowClick(ticket: HelpdeskTicket) {
    replaceParams((params) => params.set("ticket", String(ticket.id)));
  }

  function handleCloseDetail() {
    replaceParams((params) => params.delete("ticket"));
  }

  function handleNext() {
    pager.goNext(query.data?.pagination.nextCursor);
  }

  function handleRetry() {
    void query.refetch();
  }

  function handleOpenSettings() {
    setSettingsOpen(true);
  }

  function canWork(target: SupportQueue): boolean {
    return membership[target];
  }

  const emptyState = (
    <EmptyState
      illustrationPreset="mail"
      title={`No ${SUPPORT_QUEUE_LABELS[queue]} requests`}
      description={
        membership[queue]
          ? "Requests routed to this queue appear here as employees raise them."
          : "You are not a member of this queue, so only its non-confidential requests are visible to you."
      }
      filtersActive={filtersActive}
      onClearFilters={handleClearFilters}
      className="flex-1 min-h-[40vh]"
    />
  );

  return (
    <PageWrapper
      title="Employee support"
      subtitle="Company-wide requests routed to the HR, IT, Finance, Admin and Legal queues."
      actions={
        canManage ? (
          <AnimatedIconButton icon={SettingsIcon} iconSize={16} iconClassName="mr-1.5" size="sm" variant="outline" onClick={handleOpenSettings}>
            Queue settings
          </AnimatedIconButton>
        ) : undefined
      }
      filters={
        <PageTabsToolbar
          tabs={
            <Tabs value={queue} onValueChange={handleQueueChange}>
              <TabsList aria-label="Support queues">
                {SUPPORT_QUEUES.map((candidate) => (
                  <TabsTrigger key={candidate} value={candidate}>
                    <QueueTabLabel queue={candidate} summary={summaries.get(candidate)} isMember={membership[candidate]} />
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          }
          search={<SearchInput placeholder="Search requests" value={search} onValueChange={handleSearchChange} />}
          filters={
            <Select value={status ?? "all"} onValueChange={handleStatusChange}>
              <SelectTrigger className={cn("w-40", FILTER_SELECT_TRIGGER)} aria-label="Status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((candidate) => (
                  <SelectItem key={candidate} value={candidate}>
                    {REQUEST_STATUS_LABELS[candidate]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      }
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <PageState
        resolution={pageState}
        loading={<SupportRequestsTableSkeleton surface="agent" />}
        empty={emptyState}
        onRetry={handleRetry}
        className="flex-1"
      >
        <DataTable
          data={rows}
          columns={[...QUEUE_REQUEST_COLUMNS]}
          getRowKey={requestRowKey}
          onRowClick={handleRowClick}
          isLoading={query.isLoading}
          emptyState={emptyState}
          minWidth="1080px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "cursor",
            pageSize: PAGE_SIZE,
            hasMore: query.data?.pagination.hasMore ?? false,
            hasPrevious: pager.hasPrevious,
            onNext: handleNext,
            onPrevious: pager.goPrevious,
          }}
        />
      </PageState>

      <SupportRequestDetailSheet ticketId={selectedTicketId} surface="agent" canWork={canWork} onClose={handleCloseDetail} />
      {canManage ? (
        <SupportQueueSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} queues={queues.data ?? []} />
      ) : null}
    </PageWrapper>
  );
}
