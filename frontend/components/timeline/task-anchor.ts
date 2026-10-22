import type { TaskAnchorRef } from "@/types/crm/activities";

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
