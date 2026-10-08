import type { DataTableColumn } from "@/components/ui/data-table";
import type { KanbanTicket } from "../shared/types";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { PriorityBadge } from "../shared/priority-badge";
import { formatCalendarDate } from "@/lib/date-utils";
import { TruncatedText } from "@/components/ui/truncated-text";

export const MY_WORK_TABLE_COLUMNS: DataTableColumn<KanbanTicket>[] = [
  {
    key: "title",
    header: "Work item",
    className: "w-[28rem] min-w-80 max-w-[28rem]",
    headerClassName: "w-[28rem] min-w-80 max-w-[28rem]",
    cell: function renderTitle(ticket) {
      return (
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded bg-muted/70 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {formatTicketKey(
              ticket.project?.key,
              ticket.ticketNumber,
              ticket.id,
            )}
          </span>
          <TruncatedText
            text={ticket.title}
            className="min-w-0 text-sm font-medium leading-tight"
          />
        </div>
      );
    },
  },
  {
    key: "project",
    header: "Project",
    className: "hidden xl:table-cell",
    cell: function renderProject(ticket) {
      return (
        <span className="text-xs text-muted-foreground">
          {ticket.project?.name ?? "—"}
        </span>
      );
    },
  },
  {
    key: "status",
    header: "Status",
    cell: function renderStatus(ticket) {
      return <StatusBadge status={ticket.status} />;
    },
  },
  {
    key: "priority",
    header: "Priority",
    cell: function renderPriority(ticket) {
      return ticket.priority ? (
        <PriorityBadge priority={ticket.priority} showLabel />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      );
    },
  },
  {
    key: "dueDate",
    header: "Due",
    cell: function renderDueDate(ticket) {
      return (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatCalendarDate(ticket.dueDate) || "—"}
        </span>
      );
    },
  },
];
