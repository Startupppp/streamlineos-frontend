import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { UpdateTicketInput } from "@/types/projects";
import type { DisplayOptions } from "../shared/types";
import { getUserDisplayName } from "@/lib/person-display";

export interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string | null;
  points?: number | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  assigneeId?: string | null;
  cycleId?: number | null;
  sprintId?: number | null;
  dueDate?: string | null;
  startDate?: string | null;
  rank?: string | null;
  assignee?: { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; image?: string | null } | null;
  labels?: { label?: { id: number; name: string; color?: string | null } }[];
  cycle?: { id: number; name: string; status: string; startDate: string; endDate: string } | null;
}

export interface ListViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
  groupBy?: string;
  rowBy?: string;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  displayOptions?: DisplayOptions;
  showEmptyRows?: boolean;
  showEmptyColumns?: boolean;
}

export interface ListViewItemProps {
  ticket: Ticket;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  onClick: (id: number) => void;
  displayOptions?: DisplayOptions;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isDragging?: boolean;
}

export interface InlineGroupCreateProps {
  groupKey: string;
  projectId: number;
  status: string;
}

export interface OuterGroupHeaderProps {
  groupKey: string;
  rowBy: string;
  tickets: Ticket[];
  count: number;
}

export interface NestedGroupProps {
  accordionValue: string;
  groupKey: string;
  outerGroupKey: string;
  items: Ticket[];
  groupBy: string;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  displayOptions?: DisplayOptions;
  onTicketClick: (id: number) => void;
}

export interface DroppableGroupProps {
  groupKey: string;
  items: Ticket[];
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  displayOptions?: DisplayOptions;
  onTicketClick: (id: number) => void;
  shouldReduceMotion: boolean | null;
}

export type ReorderContext = { previousTickets: Ticket[] };

export function isReorderContext(v: unknown): v is ReorderContext {
  return typeof v === "object" && v !== null && "previousTickets" in v;
}

export type GroupFieldPatch = Pick<UpdateTicketInput, "status" | "priority" | "assigneeId" | "assigneeIds">;

export const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type ValidPriority = typeof VALID_PRIORITIES[number];

export function isValidPriority(v: string): v is ValidPriority {
  return VALID_PRIORITIES.some((candidate) => candidate === v);
}

export const DROPPABLE_MODES = new Set(["status", "priority", "assignee"]);

export const LIST_RENDER_PAGE_SIZE = 100;

export function getGroupKey(ticket: Ticket, groupBy: string): string {
  switch (groupBy) {
    case "status": return ticket.status ?? "None";
    case "priority": return ticket.priority ?? "None";
    case "assignee": return ticket.assignee ? getUserDisplayName(ticket.assignee) : "Unassigned";
    case "label": {
      const first = ticket.labels?.[0]?.label;
      return first ? first.name : "No label";
    }
    case "cycle": return ticket.cycle?.name ?? "No cycle";
    default: return "All Items";
  }
}

export function getGroupStatus(groupBy: string, groupKey: string, tickets: Ticket[]): string {
  if (groupBy === "status") return groupKey;
  return tickets[0]?.status ?? "TODO";
}

export function encodeNestedAccordionValue(outerKey: string, innerKey: string): string {
  return `${outerKey}||${innerKey}`;
}

export function buildGroupFieldPatch(
  groupBy: string,
  newGroupKey: string,
  tickets: Ticket[],
  ticketId: number,
): GroupFieldPatch | null {
  if (groupBy === "status") return { status: newGroupKey };
  if (groupBy === "priority") {
    if (newGroupKey === "None") return { priority: undefined };
    const upper = newGroupKey.toUpperCase();
    if (!isValidPriority(upper)) return null;
    return { priority: upper };
  }
  if (groupBy === "assignee") {
    if (newGroupKey === "Unassigned") return { assigneeIds: [] };
    const match = tickets.find((t) => t.id !== ticketId && getUserDisplayName(t.assignee) === newGroupKey);
    const id = match?.assigneeId ?? match?.assignee?.id;
    if (!id) return null;
    return { assigneeId: id };
  }
  return null;
}

export function applyLocalPatch(ticket: Ticket, patch: GroupFieldPatch, groupBy: string): Ticket {
  const next = { ...ticket };
  if (groupBy === "status" && patch.status !== undefined) next.status = patch.status;
  if (groupBy === "priority") {
    next.priority = patch.priority ?? null;
  }
  if (groupBy === "assignee") {
    if (patch.assigneeIds !== undefined) {
      next.assigneeId = patch.assigneeIds[0] ?? null;
      next.assignee = null;
    } else if (patch.assigneeId !== undefined) {
      next.assigneeId = patch.assigneeId ?? null;
    }
  }
  return next;
}
