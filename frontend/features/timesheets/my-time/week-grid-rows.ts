import type { TimesheetEntry } from "@/features/timesheets";

export interface GridRow {
  rowKey: string;
  projectId: number | null;
  ticketId: number | null;
  projectName: string;
  ticketLabel: string | null;
}

export function rowKeyOf(entry: TimesheetEntry): string {
  return `${entry.projectId ?? 0}-${entry.ticketId ?? 0}`;
}

export function deriveRows(entries: TimesheetEntry[]): GridRow[] {
  const map = new Map<string, GridRow>();
  for (const e of entries) {
    const key = rowKeyOf(e);
    if (!map.has(key)) {
      map.set(key, {
        rowKey: key,
        projectId: e.projectId,
        ticketId: e.ticketId,
        projectName: e.project?.name ?? "No project",
        ticketLabel: e.ticket
          ? `#${e.ticket.ticketNumber}: ${e.ticket.title}`
          : null,
      });
    }
  }
  return [...map.values()];
}

export function isCellLocked(entry: TimesheetEntry | undefined): boolean {
  return !!entry?.lockedAt || entry?.status === "APPROVED";
}
