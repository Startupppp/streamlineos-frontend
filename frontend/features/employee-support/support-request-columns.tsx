"use client";

import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatShortDate } from "@/lib/date-utils";
import { helpdeskCategoryLabel } from "@/lib/employee-support";
import type { HelpdeskTicket } from "@/hooks/api/hr/helpdesk-schema";
import {
  ConfidentialBadge,
  RequestPriorityBadge,
  RequestStatusBadge,
  SlaMarker,
} from "./support-request-badges";

function TitleCell({ ticket }: { ticket: HelpdeskTicket }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <TruncatedText text={ticket.title} className="text-sm font-medium text-foreground" />
      {ticket.isConfidential ? <ConfidentialBadge /> : null}
    </div>
  );
}

const titleColumn: DataTableColumn<HelpdeskTicket> = {
  key: "title",
  header: "Request",
  cell: (ticket) => <TitleCell ticket={ticket} />,
  className: "min-w-[16rem]",
};

const categoryColumn: DataTableColumn<HelpdeskTicket> = {
  key: "category",
  header: "Category",
  cell: (ticket) => <span className="text-sm text-muted-foreground">{helpdeskCategoryLabel(ticket.category)}</span>,
};

const statusColumn: DataTableColumn<HelpdeskTicket> = {
  key: "status",
  header: "Status",
  cell: (ticket) => <RequestStatusBadge status={ticket.status} />,
};

const priorityColumn: DataTableColumn<HelpdeskTicket> = {
  key: "priority",
  header: "Priority",
  cell: (ticket) => <RequestPriorityBadge priority={ticket.priority} />,
};

const slaColumn: DataTableColumn<HelpdeskTicket> = {
  key: "sla",
  header: "SLA",
  cell: (ticket) => <SlaMarker ticket={ticket} />,
};

const createdColumn: DataTableColumn<HelpdeskTicket> = {
  key: "createdAt",
  header: "Created",
  cell: (ticket) => <span className="font-mono text-sm tabular-nums">{formatShortDate(ticket.createdAt)}</span>,
};

const requesterColumn: DataTableColumn<HelpdeskTicket> = {
  key: "requester",
  header: "Requester",
  cell: (ticket) => <span className="text-sm">{ticket.authorName ?? "Employee"}</span>,
};

const assigneeColumn: DataTableColumn<HelpdeskTicket> = {
  key: "assignee",
  header: "Assignee",
  cell: (ticket) => (
    <span className="text-sm text-muted-foreground">{ticket.assigneeName ?? "Unassigned"}</span>
  ),
};

export const MY_REQUEST_COLUMNS: readonly DataTableColumn<HelpdeskTicket>[] = [
  titleColumn,
  categoryColumn,
  statusColumn,
  priorityColumn,
  slaColumn,
  createdColumn,
];

export const QUEUE_REQUEST_COLUMNS: readonly DataTableColumn<HelpdeskTicket>[] = [
  titleColumn,
  requesterColumn,
  categoryColumn,
  statusColumn,
  priorityColumn,
  slaColumn,
  assigneeColumn,
  createdColumn,
];

export function requestRowKey(ticket: HelpdeskTicket): number {
  return ticket.id;
}
