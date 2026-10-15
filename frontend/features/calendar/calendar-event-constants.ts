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
  "Some events are missing because this period reached a source or occurrence limit. Narrow the date range or retry. Very dense recurring series may still have partial coverage.";

export const EVENT_CATEGORIES = [
  "general",
  "meeting",
  "deadline",
  "reminder",
  "leave",
  "project",
  "other",
] as const;

export function eventCategoryLabel(category: (typeof EVENT_CATEGORIES)[number]): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
