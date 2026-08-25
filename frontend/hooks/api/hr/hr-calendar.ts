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

export const HR_CALENDAR_TYPE_COLORS: Record<HrCalendarEventType, string> = {
  HOLIDAY: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  LEAVE: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  BIRTHDAY: "bg-category-pink-surface text-category-pink-ink border-category-pink-rule",
  ANNIVERSARY: "bg-category-violet-surface text-category-violet-ink border-category-violet-rule",
  REVIEW_CYCLE: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  TRAVEL: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  INTERVIEW: "bg-status-info-surface text-status-info-ink border-status-info-rule",
};

export interface HrCalendarEvent {
  id: string;
  type: HrCalendarEventType;
  title: string;
  date: string;
  endDate?: string;
  meta?: Record<string, unknown>;
}

