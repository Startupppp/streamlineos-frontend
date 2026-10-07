import { isPast, isToday, parseISO } from "date-fns";
import type { AllWorkTicket } from "@/types/projects";
import type {
  BuildListSortField,
  BuildListSortDirection,
} from "@/features/build/shared/use-build-list-url-state";
import type { DueBucket } from "./my-work-rows";

export type WorkTab =
  | "assigned"
  | "created"
  | "subscribed"
  | "overdue"
  | "due-soon"
  | "activity"
  | "today"
  | "upcoming"
  | "blocked"
  | "waiting"
  | "done";

export const WORK_TABS: readonly WorkTab[] = [
  "assigned",
  "created",
  "subscribed",
  "overdue",
  "due-soon",
  "activity",
  "today",
  "upcoming",
  "blocked",
  "waiting",
  "done",
];

export const TAB_CONFIG: Record<WorkTab, { label: string }> = {
  assigned: { label: "Assigned" },
  created: { label: "Created" },
  subscribed: { label: "Subscribed" },
  overdue: { label: "Overdue" },
  "due-soon": { label: "Due Soon" },
  activity: { label: "Activity" },
  today: { label: "Today" },
  upcoming: { label: "Upcoming" },
  blocked: { label: "Blocked" },
  waiting: { label: "Waiting" },
  done: { label: "Done" },
};

export function parseWorkTab(value: string | null): WorkTab {
  if (value === "created" || value === "overdue" || value === "due-soon" || value === "activity") return value;
  if (value === "subscribed" || value === "watching") return "subscribed";
  if (value === "today" || value === "upcoming" || value === "blocked" || value === "waiting" || value === "done") return value;
  return "assigned";
}

export function tabToDefaultSort(tab: WorkTab): {
  field: BuildListSortField;
  dir: BuildListSortDirection;
} {
  if (tab === "created") return { field: "created", dir: "desc" };
  if (tab === "overdue" || tab === "today" || tab === "upcoming") return { field: "dueDate", dir: "asc" };
  if (tab === "due-soon") return { field: "dueDate", dir: "asc" };
  if (tab === "subscribed" || tab === "activity") return { field: "updated", dir: "desc" };
  if (tab === "blocked" || tab === "waiting" || tab === "done") return { field: "updated", dir: "desc" };
  return { field: "rank", dir: "desc" };
}

function getDueBucket(dueDate: string | null): DueBucket {
  if (!dueDate) return "none";
  try {
    const d = parseISO(dueDate);
    if (isToday(d)) return "today";
    if (isPast(d)) return "overdue";
    return "upcoming";
  } catch {
    return "none";
  }
}

export function toDueBucketMap(
  tickets: AllWorkTicket[],
): Record<DueBucket, AllWorkTicket[]> {
  const buckets: Record<DueBucket, AllWorkTicket[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    none: [],
  };
  for (const t of tickets) buckets[getDueBucket(t.dueDate)].push(t);
  return buckets;
}

export const EMPTY_TITLE_MAP: Record<WorkTab, string> = {
  assigned: "Nothing assigned to you",
  created: "No tickets created by you",
  subscribed: "No subscribed tickets",
  overdue: "No overdue tickets",
  "due-soon": "Nothing due soon",
  activity: "No recently updated tickets",
  today: "Nothing due today",
  upcoming: "Nothing due this week",
  blocked: "No blocked tickets",
  waiting: "No tickets waiting for review",
  done: "Nothing completed recently",
};

export const EMPTY_DESCRIPTION_MAP: Record<WorkTab, string> = {
  assigned: "Tickets assigned to you across all projects will appear here.",
  created: "Tickets you reported or created across all projects will appear here.",
  subscribed: "Tickets you are watching will appear here.",
  overdue: "Tickets past their due date that are still open will appear here.",
  "due-soon": "Open tickets due today or within the next seven days will appear here.",
  activity: "Your recently updated assigned tickets will appear here.",
  today: "Assigned tickets with a due date of today will appear here.",
  upcoming: "Assigned tickets due in the next seven days will appear here.",
  blocked: "Tickets assigned to you that are blocked by other tickets will appear here.",
  waiting: "Assigned tickets currently waiting for review will appear here.",
  done: "Tickets completed in the last seven days will appear here.",
};

export const SHOW_VIEW_SWITCHER_TABS: ReadonlySet<WorkTab> = new Set<WorkTab>([
  "assigned", "overdue", "due-soon", "today", "upcoming", "blocked", "waiting", "done",
]);
