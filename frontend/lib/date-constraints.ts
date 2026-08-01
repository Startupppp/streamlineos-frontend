import { addDays } from "date-fns";
import type { RefinementCtx } from "zod";
import { z } from "zod";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";

export type DateBoundMode = "after" | "onOrAfter";

const DEFAULT_TO_YEAR_OFFSET = 10;

export function startOfLocalDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseDateOnly(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return undefined;
  const parsed = new Date(y, m - 1, d);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== d
  ) {
    return undefined;
  }
  return parsed;
}

export function maxDate(...dates: Array<Date | undefined>): Date | undefined {
  let result: Date | undefined;
  for (const date of dates) {
    if (!date) continue;
    if (!result || date > result) result = date;
  }
  return result;
}

export function minDate(...dates: Array<Date | undefined>): Date | undefined {
  let result: Date | undefined;
  for (const date of dates) {
    if (!date) continue;
    if (!result || date < result) result = date;
  }
  return result;
}

export function planningFloorDate(existingValue?: string | null): Date {
  const today = startOfLocalDay();
  const existing = parseDateOnly(existingValue);
  if (existing && existing < today) return existing;
  return today;
}

export function endBoundFromStart(
  startDate: string | null | undefined,
  mode: DateBoundMode = "after",
): Date | undefined {
  const start = parseDateOnly(startDate);
  if (!start) return undefined;
  return mode === "after" ? addDays(start, 1) : start;
}

export function isEndInvalidForStart(
  startDate: string,
  endDate: string,
  mode: DateBoundMode = "after",
): boolean {
  if (!startDate || !endDate) return false;
  return mode === "after" ? endDate <= startDate : endDate < startDate;
}

export function clearEndIfInvalid(
  startDate: string,
  endDate: string,
  mode: DateBoundMode = "after",
): string {
  if (!endDate) return endDate;
  return isEndInvalidForStart(startDate, endDate, mode) ? "" : endDate;
}

export interface PlanningPickerBounds {
  fromDate: Date;
  fromYear: number;
  toYear: number;
}

export function planningStartPickerProps(options?: {
  existingValue?: string | null;
  toYearOffset?: number;
}): PlanningPickerBounds {
  const fromDate = planningFloorDate(options?.existingValue);
  const offset = options?.toYearOffset ?? DEFAULT_TO_YEAR_OFFSET;
  return {
    fromDate,
    fromYear: fromDate.getFullYear(),
    toYear: startOfLocalDay().getFullYear() + offset,
  };
}

export function planningEndPickerProps(options?: {
  startDate?: string | null;
  mode?: DateBoundMode;
  existingValue?: string | null;
  floorDate?: Date;
  enforceTodayFloor?: boolean;
  toYearOffset?: number;
}): PlanningPickerBounds {
  const mode = options?.mode ?? "after";
  const enforceTodayFloor = options?.enforceTodayFloor ?? true;
  const todayFloor = enforceTodayFloor
    ? planningFloorDate(options?.existingValue)
    : undefined;
  const afterStart = endBoundFromStart(options?.startDate, mode);
  const fromDate =
    maxDate(options?.floorDate, todayFloor, afterStart) ??
    todayFloor ??
    afterStart ??
    startOfLocalDay();
  const offset = options?.toYearOffset ?? DEFAULT_TO_YEAR_OFFSET;
  return {
    fromDate,
    fromYear: fromDate.getFullYear(),
    toYear: startOfLocalDay().getFullYear() + offset,
  };
}

export function resolveDatePickerYearBounds(options: {
  fromDate?: Date;
  toDate?: Date;
  fromYear?: number;
  toYear?: number;
}): { fromYear: number; toYear: number } {
  const currentYear = startOfLocalDay().getFullYear();
  const fromYear =
    options.fromYear ??
    options.fromDate?.getFullYear() ??
    1950;
  const toYear =
    options.toYear ??
    options.toDate?.getFullYear() ??
    currentYear + DEFAULT_TO_YEAR_OFFSET;
  return {
    fromYear,
    toYear: Math.max(toYear, fromYear),
  };
}

type DateOrderKeys = {
  startKey?: string;
  endKey?: string;
  mode?: DateBoundMode;
  message?: string;
};

export function refineDateOrder<T extends Record<string, unknown>>(
  data: T,
  ctx: RefinementCtx,
  options?: DateOrderKeys,
): void {
  const startKey = options?.startKey ?? "startDate";
  const endKey = options?.endKey ?? "endDate";
  const mode = options?.mode ?? "after";
  const start = data[startKey];
  const end = data[endKey];
  if (typeof start !== "string" || typeof end !== "string" || !start || !end) {
    return;
  }
  const invalid = isEndInvalidForStart(start, end, mode);
  if (!invalid) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message:
      options?.message ??
      (mode === "after"
        ? "End date must be after start date"
        : "End date must be on or after start date"),
    path: [endKey],
  });
}

export function refineNotBeforeToday(
  value: string | null | undefined,
  ctx: RefinementCtx,
  path: string,
  message = "Date cannot be in the past",
): void {
  if (!value) return;
  const today = getTodayString();
  if (value < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: [path],
    });
  }
}
