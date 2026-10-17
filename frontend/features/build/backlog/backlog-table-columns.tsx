"use client";

import type { DataTableColumn } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Ticket } from "@/types/projects";
import { TicketTypeIcon } from "@/features/build/shared/ticket-type-icon";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";

export const BACKLOG_TABLE_HEADERS = [
  "ID",
  "Type",
  "Title",
  "Status",
  "Priority",
  "Assignee",
  "Cycle",
  "Created",
] as const;

export function getBacklogColumns(
  projectKey: string | undefined,
): DataTableColumn<Ticket>[] {
  return [
    {
      key: "id",
      header: "ID",
      className: "w-[80px] font-mono text-dense text-muted-foreground",
      cell: (ticket) => (
        <span className="flex items-center gap-1.5">
          <TicketTypeIcon type={ticket.type} />
          {formatTicketKey(projectKey, ticket.ticketNumber)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      className:
        "hidden sm:table-cell w-[90px] text-dense text-muted-foreground",
      headerClassName: "hidden sm:table-cell",
      cell: (ticket) => (
        <span className="flex items-center gap-1.5">
          <TicketTypeIcon type={ticket.type} />
          <span className="capitalize text-xs">
            {ticket.type.charAt(0) + ticket.type.slice(1).toLowerCase()}
          </span>
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (ticket) => (
        <TruncatedText
          text={ticket.title ?? "—"}
          className="text-dense font-medium"
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[120px]",
      cell: (ticket) => <StatusBadge status={ticket.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      className: "hidden sm:table-cell w-[100px]",
      headerClassName: "hidden sm:table-cell",
      cell: (ticket) => <PriorityBadge priority={ticket.priority} showLabel />,
    },
    {
      key: "assignee",
      header: "Assignee",
      className: "hidden md:table-cell w-[140px]",
      headerClassName: "hidden md:table-cell",
      cell: (ticket) =>
        ticket.assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-6 w-6">
              <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
              <AvatarFallback className="text-micro">
                {getUserInitials(ticket.assignee)}
              </AvatarFallback>
            </Avatar>
            <TruncatedText
              text={getUserDisplayName(ticket.assignee)}
              className="text-dense"
            />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "cycle",
      header: "Cycle",
      className:
        "hidden lg:table-cell w-[130px] text-dense text-muted-foreground",
      headerClassName: "hidden lg:table-cell",
      cell: (ticket) =>
        ticket.cycle?.name ??
        (ticket.cycleId != null ? String(ticket.cycleId) : "—"),
    },
    {
      key: "created",
      header: "Created",
      className:
        "hidden lg:table-cell w-[110px] text-dense text-muted-foreground",
      headerClassName: "hidden lg:table-cell",
      cell: (ticket) =>
        ticket.createdAt
          ? format(new Date(ticket.createdAt), "MMM d")
          : "—",
    },
  ];
}

export function renderBacklogMobileCard(
  projectKey: string | undefined,
  ticket: Ticket,
) {
  return (
    <BuildMobileCard
      eyebrow={
        <span className="flex items-center gap-1.5">
          <TicketTypeIcon type={ticket.type} />
          {formatTicketKey(projectKey, ticket.ticketNumber)}
        </span>
      }
      title={ticket.title ?? "—"}
      status={<StatusBadge status={ticket.status} />}
      person={{ user: ticket.assignee, role: "Assignee" }}
      meta={[
        {
          label: "Priority",
          value: <PriorityBadge priority={ticket.priority} showLabel />,
        },
        {
          label: "Created",
          value: ticket.createdAt
            ? format(new Date(ticket.createdAt), "MMM d")
            : "—",
        },
      ]}
    />
  );
}
