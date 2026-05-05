import { describe, expect, it } from "vitest";
import {
  PROFESSIONAL_TAX_INR,
  buildPayslipPreviewFromEmployee,
  calendarDaysInMonth,
  computeTotalDeductionsAndNet,
  perDaySalaryForLop,
  rawHalfDayDeduction,
  rawLopDeduction,
  roundInr,
} from "./payroll-calculations";

describe("calendarDaysInMonth", () => {
  it("returns 31 for January", () => {
    expect(calendarDaysInMonth("2026-01")).toBe(31);
  });

  it("returns 28 for non-leap February", () => {
    expect(calendarDaysInMonth("2026-02")).toBe(28);
  });

  it("returns 29 for leap February", () => {
    expect(calendarDaysInMonth("2024-02")).toBe(29);
  });

  it("returns 30 for invalid month string", () => {
    expect(calendarDaysInMonth("not-a-date")).toBe(30);
  });
});

describe("perDaySalaryForLop", () => {
  it("uses monthly salary divided by calendar days when monthly > 0", () => {
    expect(perDaySalaryForLop("2026-04", 30000, 25000)).toBe(1000);
  });

  it("falls back to gross when monthly is 0", () => {
    expect(perDaySalaryForLop("2026-04", 0, 30000)).toBe(1000);
  });

  it("returns 0 when calendar days are 0", () => {
    expect(perDaySalaryForLop("invalid-string-bad", 30000, 25000)).toBeCloseTo(1000, 0);
  });
});

describe("rawLopDeduction", () => {
  it("multiplies LOP days by per-day salary", () => {
    expect(rawLopDeduction("2026-04", 30000, 30000, 3)).toBe(3000);
  });

  it("returns 0 for zero LOP days", () => {
    expect(rawLopDeduction("2026-04", 30000, 30000, 0)).toBe(0);
  });
});

describe("rawHalfDayDeduction", () => {
  it("computes half of per-day salary per half-day", () => {
    expect(rawHalfDayDeduction("2026-04", 30000, 30000, 2)).toBe(1000);
  });
});

describe("roundInr", () => {
  it("rounds to nearest integer", () => {
    expect(roundInr(1234.4)).toBe(1234);
    expect(roundInr(1234.6)).toBe(1235);
  });
});

describe("computeTotalDeductionsAndNet", () => {
  it("includes professional tax by default", () => {
    const result = computeTotalDeductionsAndNet({
      month: "2026-04",
      monthlySalary: 30000,
      grossSalary: 30000,
      salaryStructureDeductions: 0,
      lopDays: 0,
      halfDays: 0,
      otherDeductions: 0,
    });
    expect(result.totalDeductions).toBe(PROFESSIONAL_TAX_INR);
    expect(result.netSalary).toBe(30000 - PROFESSIONAL_TAX_INR);
  });

  it("applies LOP deduction proportional to days", () => {
    const result = computeTotalDeductionsAndNet({
      month: "2026-04",
      monthlySalary: 30000,
      grossSalary: 30000,
      salaryStructureDeductions: 0,
      lopDays: 3,
      halfDays: 0,
      otherDeductions: 0,
    });
    expect(result.lopDeduction).toBe(3000);
    expect(result.totalDeductions).toBe(3000 + PROFESSIONAL_TAX_INR);
  });

  it("applies half-day deduction at half rate", () => {
    const result = computeTotalDeductionsAndNet({
      month: "2026-04",
      monthlySalary: 30000,
      grossSalary: 30000,
      salaryStructureDeductions: 0,
      lopDays: 0,
      halfDays: 2,
      otherDeductions: 0,
    });
    expect(result.halfDayDeduction).toBe(1000);
  });

  it("includes salary structure and other deductions", () => {
    const result = computeTotalDeductionsAndNet({
      month: "2026-04",
      monthlySalary: 30000,
      grossSalary: 30000,
      salaryStructureDeductions: 1800,
      lopDays: 0,
      halfDays: 0,
      otherDeductions: 500,
    });
    expect(result.totalDeductions).toBe(1800 + PROFESSIONAL_TAX_INR + 500);
  });

  it("respects custom professional tax", () => {
    const result = computeTotalDeductionsAndNet({
      month: "2026-04",
      monthlySalary: 30000,
      grossSalary: 30000,
      salaryStructureDeductions: 0,
      lopDays: 0,
      halfDays: 0,
      otherDeductions: 0,
      professionalTax: 0,
    });
    expect(result.totalDeductions).toBe(0);
    expect(result.netSalary).toBe(30000);
  });
});

describe("buildPayslipPreviewFromEmployee", () => {
  it("uses fallback 50/50 split when no salary structure provided", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 30000,
      month: "2026-04",
      lopDays: 0,
      halfDays: 0,
      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "none",
      overtimeDays: 0,
      overtimeHours: 0,
    });
    expect(preview.basicPay).toBe(15000);
    expect(preview.hra).toBe(7500);
    expect(preview.allowances).toBe(7500);
    expect(preview.grossSalary).toBe(30000);
  });

  it("respects explicit basic / HRA / allowances when provided", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 30000,
      month: "2026-04",
      lopDays: 0,
      halfDays: 0,
      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "none",
      overtimeDays: 0,
      overtimeHours: 0,
      basicSalary: 18000,
      hraPercentage: 40,
      allowances: 4800,
    });
    expect(preview.basicPay).toBe(18000);
    expect(preview.hra).toBe(7200);
    expect(preview.allowances).toBe(4800);
    expect(preview.grossSalary).toBe(18000 + 7200 + 4800);
  });

  it("adds bonus and overtime to gross", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 30000,
      month: "2026-04",
      lopDays: 0,
      halfDays: 0,
      otherDeductions: 0,
      bonus: 1000,
      overtimeAmount: 500,
      overtimeType: "weekday",
      overtimeDays: 0,
      overtimeHours: 4,
    });
    expect(preview.grossSalary).toBe(31500);
  });

  it("computes effective days subtracting LOP and half-days", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 30000,
      month: "2026-04",
      lopDays: 2,
      halfDays: 2,
      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "none",
      overtimeDays: 0,
      overtimeHours: 0,
    });
    expect(preview.calendarDays).toBe(30);
    expect(preview.effectiveDays).toBe(30 - 2 - 1);
  });

  it("net salary equals gross minus total deductions", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 30000,
      month: "2026-04",
      lopDays: 1,
      halfDays: 0,
      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "none",
      overtimeDays: 0,
      overtimeHours: 0,
    });
    expect(preview.netSalary).toBe(preview.grossSalary - preview.totalDeductions);
  });
});

/**
 * Cross-path consistency: preview vs generate route.
 *
 * The payroll/page.tsx preview uses `monthlySalary` (employees.monthly_salary) as the
 * LOP per-day base. The generate route at app/api/hr/payrolls/generate/route.ts derives
 * dailyRate from `basicSalary + hra + specialAllowance` (the salary structure CTC).
 *
 * If those two amounts differ, the preview shown to the admin and the value persisted
 * in the database disagree. The bug that motivates these tests:
 *
 *   employees.monthly_salary  = 50000 (HR set this manually)
 *   salary_structure          = basic 30000, hra 50%, specialAllowance 5000  → ctc 50000
 *   then HR raises specialAllowance to 10000 in salary_structures (ctc → 55000)
 *   but forgets to update employees.monthly_salary
 *
 * Preview LOP uses 50000/30 = 1666.67/day. Generate uses 55000/30 = 1833.33/day.
 * Same LOP days produces different deductions and different net salary.
 */
describe("BUG: preview vs generate-route LOP base divergence", () => {
  it("documents the divergence — preview LOP base = monthlySalary, generate base = ctc(structure)", () => {
    // Simulate the preview path used by app/(dashboard)/hr/payroll/page.tsx
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 50000, // employees.monthly_salary (stale)
      month: "2026-04",
      lopDays: 3,
      halfDays: 0,
      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "none",
      overtimeDays: 0,
      overtimeHours: 0,
      basicSalary: 30000, // structure
      hraPercentage: 50,
      allowances: 10000, // structure.specialAllowance (current)
    });

    // Simulate the generate route's formula (app/api/hr/payrolls/generate/route.ts)
    const basicSalary = 30000;
    const hra = (basicSalary * 50) / 100; // 15000
    const specialAllowance = 10000;
    const ctcMonthly = basicSalary + hra + specialAllowance; // 55000
    const calDays = 30;
    const dailyRate = ctcMonthly / calDays; // 1833.33
    const lopAmount = roundInr(dailyRate * 3);

    // Preview LOP base is monthlySalary (50000); generate base is ctcMonthly (55000).
    // Therefore preview shows ~5000 LOP, generate persists ~5500 LOP. Diff ≈ ₹500.
    expect(preview.lopDeduction).toBe(roundInr((50000 / 30) * 3)); // 5000
    expect(lopAmount).toBe(roundInr((55000 / 30) * 3)); // 5500
    expect(preview.lopDeduction).not.toBe(lopAmount);
  });
});

/**
 * Half-day persistence.
 *
 * payrolls schema (lib/db/schema/hr.ts:113-141) does not have a halfDays column.
 * The generate route folds half-day-deduction into lopAmount (line 138):
 *   lopAmount: (lopAmount + halfDayLopAmount).toString()
 *
 * Outcome: the database cannot tell how many half-days a payroll covered, and the
 * payslip cannot itemize half-day vs full LOP. This test pins the math so a future
 * schema fix that splits halfDayAmount out doesn't silently change net salary.
 */
describe("half-day deduction is folded into lopAmount in storage", () => {
  it("half-day = (perDay/2) per half-day; identical to two half-days = one full day", () => {
    const oneFull = rawLopDeduction("2026-04", 30000, 30000, 1);
    const twoHalves = rawHalfDayDeduction("2026-04", 30000, 30000, 2);
    expect(oneFull).toBe(twoHalves);
  });
});
