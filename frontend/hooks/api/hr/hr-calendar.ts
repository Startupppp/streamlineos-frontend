"use client";

export const HR_CALENDAR_EVENT_TYPES = [
  "HOLIDAY",
  "LEAVE",
  "BIRTHDAY",
  "ANNIVERSARY",
  "REVIEW_CYCLE",
  "TRAVEL",
  "INTERVIEW",
] as const;

export type HrCalendarEventType = (typeof HR_CALENDAR_EVENT_TYPES)[number];

export const HR_CALENDAR_TYPE_LABELS: Record<HrCalendarEventType, string> = {
  HOLIDAY: "Holiday",
  LEAVE: "Leave",
  BIRTHDAY: "Birthday",
  ANNIVERSARY: "Anniversary",
  REVIEW_CYCLE: "Review Cycle",
  TRAVEL: "Travel",
  INTERVIEW: "Interview",
};

/**
 * Seven kinds of entry sharing one month grid, so the colour is how you read
 * the grid at a glance. Four of them collapsed onto "info" and two onto
 * "warning", which made a birthday and a review cycle the same chip.
 */
export const HR_CALENDAR_TYPE_COLORS: Record<HrCalendarEventType, string> = {
  HOLIDAY: "bg-category-blue-surface text-category-blue-ink border-category-blue-rule",
  LEAVE: "bg-category-amber-surface text-category-amber-ink border-category-amber-rule",
  BIRTHDAY: "bg-category-pink-surface text-category-pink-ink border-category-pink-rule",
  ANNIVERSARY: "bg-category-violet-surface text-category-violet-ink border-category-violet-rule",
  REVIEW_CYCLE: "bg-category-indigo-surface text-category-indigo-ink border-category-indigo-rule",
  TRAVEL: "bg-category-orange-surface text-category-orange-ink border-category-orange-rule",
  INTERVIEW: "bg-category-cyan-surface text-category-cyan-ink border-category-cyan-rule",
};

export interface HrCalendarEvent {
  id: string;
  type: HrCalendarEventType;
  title: string;
  date: string;
  endDate?: string;
  meta?: Record<string, unknown>;
}

