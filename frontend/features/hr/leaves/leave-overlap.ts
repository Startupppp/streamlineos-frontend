import { formatShortDate } from "@/lib/date-utils";

export interface LeaveSpan {
  id: number;
  status: string | null;
  startDate: string | Date;
  endDate: string | Date;
  leaveType?: { name: string } | null;
}

export interface LeaveOverlap {
  id: number;
  startDate: string;
  endDate: string;
  typeName: string | null;
}

const pad = (value: number): string => String(value).padStart(2, "0");

export function leaveDayKey(value: string | Date | null | undefined): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;
}

export function findLeaveOverlap(
  existing: readonly LeaveSpan[],
  startDate: string,
  endDate: string,
  excludeId?: number,
): LeaveOverlap | null {
  const from = leaveDayKey(startDate);
  const to = leaveDayKey(endDate);
  if (!from || !to || from > to) return null;

  for (const span of existing) {
    if (span.status !== "APPROVED") continue;
    if (excludeId !== undefined && span.id === excludeId) continue;
    const spanFrom = leaveDayKey(span.startDate);
    const spanTo = leaveDayKey(span.endDate);
    if (!spanFrom || !spanTo) continue;
    if (spanFrom <= to && from <= spanTo) {
      return {
        id: span.id,
        startDate: spanFrom,
        endDate: spanTo,
        typeName: span.leaveType?.name ?? null,
      };
    }
  }
  return null;
}

export function leaveOverlapMessage(overlap: LeaveOverlap): string {
  const label = overlap.typeName ? `approved ${overlap.typeName}` : "approved leave";
  const range =
    overlap.startDate === overlap.endDate
      ? formatShortDate(overlap.startDate)
      : `${formatShortDate(overlap.startDate)} – ${formatShortDate(overlap.endDate)}`;
  return `These dates overlap your ${label} on ${range}. Cancel that request first or pick other dates.`;
}
