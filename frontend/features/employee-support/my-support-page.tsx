"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
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
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useMySupportRequests } from "@/hooks/api/employee-self-service/support";
import type { HelpdeskTicket, TicketStatus } from "@/hooks/api/hr/helpdesk-schema";
import { cn } from "@/lib/utils";
import { REQUEST_STATUS_LABELS } from "./support-request-badges";
import { MY_REQUEST_COLUMNS, requestRowKey } from "./support-request-columns";
import { SupportRequestsTableSkeleton } from "./support-requests-table-skeleton";
import { CreateRequestDialog } from "./create-request-dialog";
import { SupportRequestDetailSheet } from "./support-request-detail-sheet";

const PAGE_SIZE = 20;
const STATUSES: readonly TicketStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

function readStatus(value: string | null): TicketStatus | undefined {
  return STATUSES.find((status) => status === value);
}

function readTicketId(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function neverWorkable(): boolean {
  return false;
}

export function MySupportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = readStatus(searchParams.get("status"));
  const selectedTicketId = readTicketId(searchParams.get("request"));
  const [createOpen, setCreateOpen] = useState(false);
  const pager = useCursorPager(status ?? "all");
  const canRaise = useCan("self:support");

  const query = useMySupportRequests({ limit: PAGE_SIZE, cursor: pager.cursor, status });
  const rows: HelpdeskTicket[] = query.data?.data ?? [];
  const pageState = usePageState({
    permission: "self:support",
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

  function handleStatusChange(value: string) {
    replaceParams((params) => {
      if (value === "all") params.delete("status");
      else params.set("status", value);
    });
  }

  function handleRowClick(ticket: HelpdeskTicket) {
    replaceParams((params) => params.set("request", String(ticket.id)));
  }

  function handleCloseDetail() {
    replaceParams((params) => params.delete("request"));
  }

  function handleCreateOpen() {
    setCreateOpen(true);
  }

  function handleNext() {
    pager.goNext(query.data?.pagination.nextCursor);
  }

  function handleRetry() {
    void query.refetch();
  }

  const filtersActive = status !== undefined;

  function handleClearFilters() {
    handleStatusChange("all");
  }

  const emptyState = (
    <EmptyState
      illustrationPreset="mail"
      title="No requests yet"
      description="Raise a request and it is routed to the right team by category. HR and Legal requests stay confidential."
      action={canRaise ? { label: "Create request", onClick: handleCreateOpen } : undefined}
      filtersActive={filtersActive}
      onClearFilters={handleClearFilters}
      className="flex-1 min-h-[40vh]"
    />
  );

  return (
    <PageWrapper
      title="Employee support"
      subtitle="Raise a request to HR, IT, Finance, Admin or Legal and follow it here."
      actions={
        canRaise ? (
          <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm" onClick={handleCreateOpen}>
            Create request
          </AnimatedIconButton>
        ) : undefined
      }
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
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <PageState
        resolution={pageState}
        loading={<SupportRequestsTableSkeleton surface="self" />}
        empty={emptyState}
        onRetry={handleRetry}
        className="flex-1"
      >
        <DataTable
          data={rows}
          columns={[...MY_REQUEST_COLUMNS]}
          getRowKey={requestRowKey}
          onRowClick={handleRowClick}
          isLoading={query.isLoading}
          emptyState={emptyState}
          minWidth="760px"
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

      <CreateRequestDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SupportRequestDetailSheet ticketId={selectedTicketId} surface="self" canWork={neverWorkable} onClose={handleCloseDetail} />
    </PageWrapper>
  );
}
