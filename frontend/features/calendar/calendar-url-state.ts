import { format } from "date-fns";
import type { View } from "./big-calendar-wrapper";

export type CalendarViewMode = "calendar" | "list" | "history" | "my-day";
export type CalendarSelectionSource =
  | "calendar"
  | "build"
  | "tasks"
  | "crm"
  | "hr"
  | "attendance"
  | "external"
  | "other";

export interface CalendarSelection {
  source: CalendarSelectionSource;
  id: string;
}

export interface CalendarUrlState {
  date: Date;
  view: View;
  mode: CalendarViewMode;
  hrVisible: boolean;
  crmVisible: boolean;
  attendanceVisible: boolean;
  hiddenConnectionIds: number[];
  savedFilterId: string | null;
  selected: CalendarSelection | null;
  historyBefore: string;
  historyPages: number;
}

const VIEWS = new Set<View>(["day", "week", "month"]);
const MODES = new Set<CalendarViewMode>(["calendar", "list", "history", "my-day"]);
const SELECTION_SOURCES = new Set<CalendarSelectionSource>([
  "calendar",
  "build",
  "tasks",
  "crm",
  "hr",
  "attendance",
  "external",
  "other",
]);

function parseDate(value: string | null, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) || format(parsed, "yyyy-MM-dd") !== value
    ? fallback
    : parsed;
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === "1") return true;
  if (value === "0") return false;
  return fallback;
}

function parseHiddenConnections(value: string | null): number[] {
  if (!value) return [];
  return [...new Set(
    value
      .split(",")
      .filter((part) => /^[1-9]\d{0,9}$/.test(part))
      .map(Number)
      .filter((id) => Number.isSafeInteger(id) && id <= 2_147_483_647),
  )].slice(0, 100);
}

function parseSelection(params: URLSearchParams): CalendarSelection | null {
  const id = params.get("event");
  if (!id || id.length > 512 || /[\u0000-\u001f\u007f]/.test(id)) return null;
  const sourceValue = params.get("eventSource") ?? "calendar";
  if (!SELECTION_SOURCES.has(sourceValue as CalendarSelectionSource)) return null;
  return { source: sourceValue as CalendarSelectionSource, id };
}

function parseHistoryBefore(value: string | null, fallback: Date): string {
  if (!value) return fallback.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString();
}

function parseHistoryPages(value: string | null): number {
  if (!value || !/^\d{1,3}$/.test(value)) return 1;
  const pages = Number(value);
  return Number.isInteger(pages) && pages >= 1 && pages <= 120 ? pages : 1;
}

function parseSavedFilter(value: string | null): string | null {
  if (!value || value.length > 100 || !/^[A-Za-z0-9_.:-]+$/.test(value)) return null;
  return value;
}

export function parseCalendarUrlState(
  params: URLSearchParams,
  fallbackNow: Date,
): CalendarUrlState {
  const viewValue = params.get("view");
  const modeValue = params.get("mode");
  return {
    date: parseDate(params.get("date"), fallbackNow),
    view: VIEWS.has(viewValue as View) ? viewValue as View : "week",
    mode: MODES.has(modeValue as CalendarViewMode)
      ? modeValue as CalendarViewMode
      : "calendar",
    hrVisible: parseBoolean(params.get("hr"), true),
    crmVisible: parseBoolean(params.get("crm"), true),
    attendanceVisible: parseBoolean(params.get("attendance"), true),
    hiddenConnectionIds: parseHiddenConnections(params.get("hiddenAccounts")),
    savedFilterId: parseSavedFilter(params.get("filter")),
    selected: parseSelection(params),
    historyBefore: parseHistoryBefore(params.get("historyBefore"), fallbackNow),
    historyPages: parseHistoryPages(params.get("historyPages")),
  };
}

export function calendarUrl(
  current: URLSearchParams,
  changes: Record<string, string | null>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/calendar?${query}` : "/calendar";
}
