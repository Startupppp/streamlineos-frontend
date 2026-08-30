import type { KanbanTicket, KanbanColumn } from "../shared/types";

export const BOARD_COLUMN_VIRTUALIZATION_THRESHOLD = 15;

export type StatusEntry = {
  id: number;
  name: string;
  color: string | null;
  order: number;
  wipLimit?: number | null;
  type?: string | null;
};

export const COLUMN_DND_TYPE = "COLUMN";

export function compareByRank<T extends { rank?: string | null; id: number }>(
  a: T,
  b: T,
): number {
  const ra = parseFloat(a.rank ?? "0");
  const rb = parseFloat(b.rank ?? "0");
  if (ra !== rb) return ra - rb;
  return a.id - b.id;
}

export function computeOptimisticRank(
  beforeRank: string | null,
  afterRank: string | null,
): string {
  const before = beforeRank != null ? parseFloat(beforeRank) : null;
  const after = afterRank != null ? parseFloat(afterRank) : null;
  if (before != null && after != null) return String((before + after) / 2);
  if (after != null) return String(after - 1000);
  if (before != null) return String(before + 1000);
  return "1000";
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "TODO", name: "To Do", color: "#94a3b8", order: 0 },
  { id: "IN_PROGRESS", name: "In Progress", color: "#3b82f6", order: 1 },
  { id: "IN_REVIEW", name: "In Review", color: "#eab308", order: 2 },
  { id: "DONE", name: "Done", color: "#22c55e", order: 3 },
];

export function columnDraggableId(col: KanbanColumn): string {
  return `column-${col.statusId ?? col.id}`;
}

export function encodeRowKey(key: string): string {
  return key.replace(/\|/g, "__PIPE__");
}

export function decodeRowKey(key: string): string {
  return key.replace(/__PIPE__/g, "|");
}

export function formatStatusName(name: string): string {
  return name.replace(/_/g, " ");
}

export function buildColumns(
  statusList: StatusEntry[] | undefined,
  ticketStatuses: string[],
): KanbanColumn[] {
  if (!statusList || statusList.length === 0) return DEFAULT_COLUMNS;
  const configured = statusList.map((s) => ({
    id: s.name,
    statusId: s.id,
    name: formatStatusName(s.name),
    color: s.color,
    order: s.order,
  }));
  const configuredIds = new Set(configured.map((c) => c.id));
  const orphanStatuses = [...new Set(ticketStatuses)].filter(
    (s) => !configuredIds.has(s),
  );
  if (orphanStatuses.length === 0) return configured;
  return [
    ...configured,
    ...orphanStatuses.map((s, i) => ({
      id: s,
      name: formatStatusName(s),
      color: null as string | null,
      order: configured.length + i,
    })),
  ];
}

export function applyColumnOrder(items: KanbanColumn[]): KanbanColumn[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export function groupTicketsByStatus(
  tickets: KanbanTicket[],
): Map<string, KanbanTicket[]> {
  const map = new Map<string, KanbanTicket[]>();
  for (const ticket of tickets) {
    const list = map.get(ticket.status);
    if (list) list.push(ticket);
    else map.set(ticket.status, [ticket]);
  }
  for (const list of map.values()) {
    list.sort(compareByRank);
  }
  return map;
}
