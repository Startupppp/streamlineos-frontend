import type { TaskAnchorRef } from "@/types/crm/activities";

/**
 * Where a task's own record lives.
 *
 * A personal task list is a list of verbs until it says what each one is about,
 * and a name a reader cannot click is only half of that. Parties and subjects
 * open as sheets over their list page, so both are addressed by a query
 * parameter rather than a route of their own.
 */
export function taskAnchorHref(anchor: TaskAnchorRef): string {
  switch (anchor.kind) {
    case "party":
      return `/parties?partyId=${encodeURIComponent(anchor.id)}`;
    case "deal":
      return `/crm/deals/${encodeURIComponent(anchor.id)}`;
    case "subject":
      return `/subjects?subjectId=${encodeURIComponent(anchor.id)}`;
  }
}

/** What to call it when the record it belonged to is gone. */
export function taskAnchorLabel(anchor: TaskAnchorRef): string {
  if (anchor.name?.trim()) return anchor.name.trim();

  switch (anchor.kind) {
    case "party":
      return "A record";
    case "deal":
      return "A deal";
    case "subject":
      return "A subject";
  }
}
