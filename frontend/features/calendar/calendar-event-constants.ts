export const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#ca8a04",
};

export const CALENDAR_TRUNCATED_WARNING =
  "This period has more events than the calendar can load at once, so some are not shown — including occurrences of a very frequent repeating event. Pick a shorter date range to see them all.";

export const EVENT_CATEGORIES = [
  "general",
  "meeting",
  "deadline",
  "reminder",
  "leave",
  "project",
  "other",
] as const;
