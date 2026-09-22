"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { HelpdeskTicket } from "@/hooks/api/hr/helpdesk-schema";
import { MY_REQUEST_COLUMNS, QUEUE_REQUEST_COLUMNS, requestRowKey } from "./support-request-columns";

const NO_ROWS: HelpdeskTicket[] = [];

function noop() {}

export function SupportRequestsTableSkeleton({ surface }: { surface: "self" | "agent" }) {
  const columns: readonly DataTableColumn<HelpdeskTicket>[] = surface === "self" ? MY_REQUEST_COLUMNS : QUEUE_REQUEST_COLUMNS;
  return (
    <DataTable
      data={NO_ROWS}
      columns={[...columns]}
      getRowKey={requestRowKey}
      isLoading
      className="flex-1 min-h-0"
      minWidth={surface === "self" ? "760px" : "1080px"}
      pagination={{ mode: "cursor", pageSize: 20, hasMore: false, hasPrevious: false, onNext: noop, onPrevious: noop }}
    />
  );
}
