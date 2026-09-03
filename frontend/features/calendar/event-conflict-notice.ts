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

export function describeEventConflicts(result: EventConflictResult): string | null {
  const parts: string[] = [];

  const overlaps = result.eventConflicts?.length ?? 0;
  if (overlaps > 0)
    parts.push(
      `it clashes with ${overlaps} event${overlaps === 1 ? "" : "s"} already on your calendar`,
    );

  const outOfOffice = describeOutOfOffice(result.oooConflicts ?? []);
  if (outOfOffice) parts.push(outOfOffice);

  return parts.length > 0 ? parts.join(", and ") : null;
}
