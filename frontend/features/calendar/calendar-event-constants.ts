export const EVENT_COLORS: Record<string, string> = {
  blue: "#2563eb",
  green: "#15803d",
  red: "#dc2626",
  yellow: "#b45309",
  purple: "#9333ea",
  gold: "#a16207",
};

export const EVENT_CATEGORY_COLORS: Record<string, string> = {
  huddle: "#c2410c",
};

export const EVENT_INK = "#ffffff";

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
