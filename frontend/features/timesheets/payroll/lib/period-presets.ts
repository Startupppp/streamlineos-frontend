import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  startOfYear,
  differenceInCalendarDays,
  addDays,
} from "date-fns";
import type { PayPeriod } from "../types";

export type PeriodPreset = "this-period" | "last-period" | "this-month" | "last-month" | "custom";

function getBiweeklyBlock(date: Date): { from: Date; to: Date } {
  const yearStart = startOfYear(date);
  const dayOfYear = differenceInCalendarDays(date, yearStart);
  const blockIndex = Math.floor(dayOfYear / 14);
  const from = addDays(yearStart, blockIndex * 14);
  const to = addDays(from, 13);
  return { from, to };
}

function getSemimonthlyBlock(date: Date): { from: Date; to: Date } {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();
  if (day <= 15) {
    return {
      from: new Date(year, month, 1),
      to: new Date(year, month, 15),
    };
  }
  return {
    from: new Date(year, month, 16),
    to: endOfMonth(date),
  };
}

export function getPresetRange(
  preset: PeriodPreset,
  payPeriod: PayPeriod,
): { from: string; to: string } {
  const now = new Date();

  if (preset === "this-month") {
    return {
      from: format(startOfMonth(now), "yyyy-MM-dd"),
      to: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }

  if (preset === "last-month") {
    const prev = subMonths(now, 1);
    return {
      from: format(startOfMonth(prev), "yyyy-MM-dd"),
      to: format(endOfMonth(prev), "yyyy-MM-dd"),
    };
  }

  if (preset === "custom") {
    return { from: "", to: "" };
  }

  if (preset === "this-period") {
    switch (payPeriod) {
      case "WEEKLY": {
        return {
          from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      }
      case "BIWEEKLY": {
        const block = getBiweeklyBlock(now);
        return {
          from: format(block.from, "yyyy-MM-dd"),
          to: format(block.to, "yyyy-MM-dd"),
        };
      }
      case "SEMIMONTHLY": {
        const block = getSemimonthlyBlock(now);
        return {
          from: format(block.from, "yyyy-MM-dd"),
          to: format(block.to, "yyyy-MM-dd"),
        };
      }
      case "MONTHLY":
      default:
        return {
          from: format(startOfMonth(now), "yyyy-MM-dd"),
          to: format(endOfMonth(now), "yyyy-MM-dd"),
        };
    }
  }

  if (preset === "last-period") {
    switch (payPeriod) {
      case "WEEKLY": {
        const prev = subWeeks(now, 1);
        return {
          from: format(startOfWeek(prev, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          to: format(endOfWeek(prev, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      }
      case "BIWEEKLY": {
        const prevCenter = subWeeks(now, 2);
        const block = getBiweeklyBlock(prevCenter);
        return {
          from: format(block.from, "yyyy-MM-dd"),
          to: format(block.to, "yyyy-MM-dd"),
        };
      }
      case "SEMIMONTHLY": {
        const pivotDate = now.getDate() <= 15
          ? new Date(now.getFullYear(), now.getMonth(), 20)
          : new Date(now.getFullYear(), now.getMonth(), 1);
        const block = getSemimonthlyBlock(pivotDate);
        return {
          from: format(block.from, "yyyy-MM-dd"),
          to: format(block.to, "yyyy-MM-dd"),
        };
      }
      case "MONTHLY":
      default: {
        const prev = subMonths(now, 1);
        return {
          from: format(startOfMonth(prev), "yyyy-MM-dd"),
          to: format(endOfMonth(prev), "yyyy-MM-dd"),
        };
      }
    }
  }

  return {
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}
