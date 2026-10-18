import { format, parseISO } from "date-fns";
import { calendarUrl } from "./calendar-url-state";
import type {
  CalendarEventConflict,
  CalendarOooConflict,
} from "@/hooks/api/calendar";

/**
 * One sentence naming what the newly created event clashes with.
 *
 * `POST /calendar/events` computes two conflict lists on every create — a paged
 * scan for overlapping occurrences and a join against approved leave — and both
 * were discarded by the client, so double-booking yourself and inviting someone
 * on approved leave were both reported as a plain "Event created".
 *
 * The conflicts arrive WITH the created row (the scan runs inside the insert's
 * transaction and has no route of its own), so this is a notice after the fact,
 * not a gate before it.
 */

interface EventConflictResult {
  eventConflicts?: CalendarEventConflict[] | null;
  oooConflicts?: CalendarOooConflict[] | null;
}

/** Beyond this many names the rest are counted, so the toast stays one line. */
const MAX_NAMED_ATTENDEES = 2;

/** Beyond this many event titles we fall back to a count to keep the toast readable. */
const MAX_NAMED_CONFLICTS = 2;

function joinNames(names: string[], hiddenCount: number): string {
  const tail = hiddenCount > 0
    ? `${hiddenCount} other${hiddenCount === 1 ? "" : "s"}`
    : null;
  const parts = tail ? [...names, tail] : names;
  if (parts.length === 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * A missing name is COUNTED, never replaced with the user id: a visible id is a
 * defect in its own right (frontend CLAUDE.md §5).
 */
function describeOutOfOffice(conflicts: CalendarOooConflict[]): string | null {
  const byUser = new Map<string, string | null>();
  for (const conflict of conflicts) {
    const name = conflict.userName?.trim();
    const existing = byUser.get(conflict.userId);
    if (existing === undefined || (existing === null && name))
      byUser.set(conflict.userId, name && name.length > 0 ? name : null);
  }
  if (byUser.size === 0) return null;

  const named = [...byUser.values()].filter((name): name is string => name !== null);
  if (named.length === 0)
    return `${byUser.size} attendee${byUser.size === 1 ? " is" : "s are"} on approved leave`;

  const shown = named.slice(0, MAX_NAMED_ATTENDEES);
  const hidden = byUser.size - shown.length;
  const subject = joinNames(shown, hidden);
  const plural = shown.length + (hidden > 0 ? 1 : 0) > 1;
  return `${subject} ${plural ? "are" : "is"} on approved leave`;
}

function describeOverlaps(conflicts: CalendarEventConflict[]): string | null {
  if (conflicts.length === 0) return null;
  const named = conflicts
    .slice(0, MAX_NAMED_CONFLICTS)
    .map((c) => (c.title?.trim() ? `"${c.title.trim()}"` : null))
    .filter((t): t is string => t !== null);
  const hidden = conflicts.length - named.length;
  if (named.length === 0)
    return `it clashes with ${conflicts.length} event${conflicts.length === 1 ? "" : "s"} already on your calendar`;
  const tail = hidden > 0 ? ` and ${hidden} other${hidden === 1 ? "" : "s"}` : "";
  const joined = named.join(", ");
  return `it clashes with ${joined}${tail}`;
}

export function describeEventConflicts(result: EventConflictResult): string | null {
  const parts: string[] = [];

  const overlapMsg = describeOverlaps(result.eventConflicts ?? []);
  if (overlapMsg) parts.push(overlapMsg);

  const outOfOffice = describeOutOfOffice(result.oooConflicts ?? []);
  if (outOfOffice) parts.push(outOfOffice);

  return parts.length > 0 ? parts.join(", and ") : null;
}

export function eventConflictViewUrl(result: EventConflictResult, search: string): string | null {
  const first = result.eventConflicts?.[0];
  if (!first) return null;
  const start = parseISO(first.startDate);
  if (Number.isNaN(start.getTime())) return null;
  return calendarUrl(new URLSearchParams(search), {
    date: format(start, "yyyy-MM-dd"),
    view: "day",
    mode: "calendar",
    event: null,
    eventSource: null,
  });
}
