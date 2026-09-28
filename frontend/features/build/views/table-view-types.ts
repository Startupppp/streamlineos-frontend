import type { DisplayOptions } from "../shared/types";
import { isCompletedTicketStatus } from "../shared/completed-status";

export interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string | null;
  points?: number | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  assigneeId?: string | null;
  cycleId?: number | null;
  version: number;
  assignee?: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  labels?: { label?: { id: number; name: string; color?: string | null } }[];
}

export interface TableViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{
    name: string;
    color: string | null;
    type?: string | null;
  }>;
  displayOptions?: DisplayOptions;
  selection?: {
    selected: Set<string | number>;
    onChange: (sel: Set<string | number>) => void;
  };
}

export function isOverdue(
  ticket: Ticket,
  statuses?: Array<{ name: string; type?: string | null }>,
): boolean {
  if (!ticket.dueDate || isCompletedTicketStatus(ticket.status, statuses))
    return false;
  const due = new Date(ticket.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}
