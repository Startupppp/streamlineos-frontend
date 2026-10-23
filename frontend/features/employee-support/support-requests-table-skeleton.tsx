"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { HelpdeskTicket } from "@/hooks/api/hr/helpdesk-schema";
import {
  MY_REQUEST_COLUMNS,
  QUEUE_REQUEST_COLUMNS,
  requestRowKey,
  SupportRequestMobileCard,
} from "./support-request-columns";

const NO_ROWS: HelpdeskTicket[] = [];

function noop() {}

function renderMobileCard(ticket: HelpdeskTicket) {
  return <SupportRequestMobileCard ticket={ticket} />;
}

export function SupportRequestsTableSkeleton({ surface }: { surface: "self" | "agent" }) {
  const columns: readonly DataTableColumn<HelpdeskTicket>[] =
    surface === "self" ? MY_REQUEST_COLUMNS : QUEUE_REQUEST_COLUMNS;
  return (
    <DataTable
      data={NO_ROWS}
      columns={[...columns]}
      getRowKey={requestRowKey}
      isLoading
      mobileCard={renderMobileCard}
      className="flex-1 min-h-0 min-w-0"
      minWidth={surface === "self" ? "760px" : "1080px"}
      pagination={{
        mode: "cursor",
        pageSize: 20,
        hasMore: false,
        hasPrevious: false,
        onNext: noop,
        onPrevious: noop,
      }}
    />
  );
}
