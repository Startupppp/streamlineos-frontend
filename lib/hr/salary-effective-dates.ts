import { formatDateOnlyUTC } from "@/lib/date-utils";
import { calendarDaysInMonth, roundInr } from "@/lib/hr/payroll-calculations";

/**
 * OPEN-04: New salary applies from the 1st of a calendar month only.
 * If HR picks any day other than the 1st, snap to the first day of the **next** calendar month.
 */
export function snapSalaryEffectiveFrom(input: string | Date): string {
  const d = typeof input === "string" ? new Date(`${input.slice(0, 10)}T12:00:00.000Z`) : new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid effectiveFrom date");
  }
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (day === 1) {
    return formatDateOnlyUTC(new Date(Date.UTC(y, m, 1)));
  }
  const next = new Date(Date.UTC(y, m + 1, 1));
  return formatDateOnlyUTC(next);
}

/** Calendar day immediately before `yyyyMmDd` (ISO date string). */
export function dayBeforeIsoDate(yyyyMmDd: string): string {
  const d = new Date(`${yyyyMmDd.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  d.setUTCDate(d.getUTCDate() - 1);
  return formatDateOnlyUTC(d);
}

export type SalaryStructureLike = {
  effectiveFrom: string;
  effectiveTo: string | null;
  basicSalary: string;
  hraPercentage: string | null;
  specialAllowance: string | null;
};

/**
 * Pick the single salary structure row that applies to the entire payroll month (no in-month proration).
 * Uses max(effectiveFrom) among rows overlapping [monthStart, monthEnd].
 */
export function pickSalaryStructureForPayrollMonth<T extends SalaryStructureLike>(
  structures: T[],
  monthYyyyMm: string
): T | null {
  const lastDay = calendarDaysInMonth(monthYyyyMm);
  const monthStart = `${monthYyyyMm}-01`;
  const monthEnd = `${monthYyyyMm}-${String(lastDay).padStart(2, "0")}`;
  const applicable = structures.filter(
    (s) =>
      s.effectiveFrom <= monthEnd &&
      (s.effectiveTo == null || s.effectiveTo === "" || s.effectiveTo >= monthStart)
  );
  if (applicable.length === 0) return null;
  return applicable.reduce((a, b) => (a.effectiveFrom >= b.effectiveFrom ? a : b));
}

export function componentsFromStructureRow(s: SalaryStructureLike): {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  ctcMonthly: number;
} {
  const basicSalary = roundInr(parseFloat(s.basicSalary));
  const hraPct = parseFloat(s.hraPercentage ?? "50");
  const hra = roundInr((basicSalary * hraPct) / 100);
  const specialAllowance = roundInr(parseFloat(s.specialAllowance ?? "0"));
  const ctcMonthly = roundInr(basicSalary + hra + specialAllowance);
  return { basicSalary, hra, specialAllowance, ctcMonthly };
}

/**
 * Resolves the monthly CTC used for payroll before the fixed 50/25/25 split
 * ({@link splitMonthlyCtc505025} in payroll-calculations).
 *
 * With a structure row for the month: `max(structure CTC, employee monthly)` when monthly is set;
 * otherwise structure CTC alone. With no row for the month: employee monthly, else fallback structure CTC.
 */
export function resolvePayrollMonthlyCtc(input: {
  picked: SalaryStructureLike | null;
  fallbackStructure: SalaryStructureLike | null;
  employeeMonthlySalary: number;
}): number {
  const monthly = roundInr(input.employeeMonthlySalary);
  if (input.picked) {
    const c = componentsFromStructureRow(input.picked);
    if (monthly > 0) {
      return roundInr(Math.max(c.ctcMonthly, monthly));
    }
    return c.ctcMonthly;
  }
  if (monthly > 0) {
    return monthly;
  }
  if (input.fallbackStructure) {
    return componentsFromStructureRow(input.fallbackStructure).ctcMonthly;
  }
  return 0;
}
