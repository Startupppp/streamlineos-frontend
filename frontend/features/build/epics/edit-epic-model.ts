import {
  EPIC_PRIORITIES,
  EPIC_STATUSES,
  type EditEpicInput,
} from "./epic-schema";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";

export function toPriority(
  value: string | null | undefined,
): EditEpicInput["priority"] {
  return EPIC_PRIORITIES.find((p) => p === value) ?? "MEDIUM";
}

export function toStatus(value: string | null | undefined): EditEpicInput["status"] {
  return EPIC_STATUSES.find((s) => s === value) ?? "TODO";
}

export const STATUS_LABEL: Record<EditEpicInput["status"], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

interface EpicBaseline {
  title: string;
  description?: string | null;
  priority?: string | null;
  status: string | null;
}

export function buildEpicConflictDiffs(
  pending: EditEpicInput,
  server: EpicBaseline,
): TicketConflictFieldDiff[] {
  const shown = (value: unknown): string =>
    value === null || value === undefined || value === "" ? "—" : String(value);
  const diffs: TicketConflictFieldDiff[] = [];
  if (pending.title !== server.title)
    diffs.push({
      key: "title",
      label: "Title",
      serverValue: shown(server.title),
      pendingValue: shown(pending.title),
    });
  if ((pending.description ?? "") !== (server.description ?? ""))
    diffs.push({
      key: "description",
      label: "Description",
      serverValue: shown(server.description),
      pendingValue: shown(pending.description),
    });
  if (pending.priority !== toPriority(server.priority))
    diffs.push({
      key: "priority",
      label: "Priority",
      serverValue: shown(toPriority(server.priority)),
      pendingValue: shown(pending.priority),
    });
  if (pending.status !== toStatus(server.status))
    diffs.push({
      key: "status",
      label: "Status",
      serverValue: shown(toStatus(server.status)),
      pendingValue: shown(pending.status),
    });
  return diffs;
}
