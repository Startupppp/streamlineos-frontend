/** India payroll helpers — keep LOP / half-day / net aligned between preview UI and generate API */

export const PROFESSIONAL_TAX_INR = 200;

/** OPEN-11: Minimum logged work hours for holiday/Sunday “full day” overtime or extra pay. */
export const HOLIDAY_WORK_FULL_DAY_HOURS = 9;

export interface ProrationSegment {
  basicSalary: number;
  hraPercentage: number;
  specialAllowance: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface ProratedComponents {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  ctcMonthly: number;
  segmentDays: { from: string; to: string; days: number; ctc: number }[];
}

/**
 * Compute pro-rated salary components when one or more salary structures span
 * the payroll month. Each segment is the portion of the month its structure is
 * active; per-segment CTC is `(basic + hra + specialAllowance) × days_in_segment / calendar_days`.
 *
 * Inputs: structures sorted by effectiveFrom asc. Each must have effectiveFrom ≤ monthEnd
 * and effectiveTo null OR effectiveTo ≥ monthStart. The caller is responsible for that
 * overlap filter (typically a database query).
 *
 * Returns the sum of per-segment components plus a debug breakdown.
 */
export function computeProratedSalary(
  monthYyyyMm: string,
  structures: ProrationSegment[]
): ProratedComponents {
  const calDays = calendarDaysInMonth(monthYyyyMm);
  const [yr, mo] = monthYyyyMm.split("-").map(Number);
  const monthStartDay = 1;
  const monthEndDay = calDays;

  const dayOfMonth = (s: string): number => {
    const parts = s.slice(0, 10).split("-").map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return monthStartDay;
    const [py, pm, pd] = parts;
    if (py < yr || (py === yr && pm < mo)) return monthStartDay;
    if (py > yr || (py === yr && pm > mo)) return monthEndDay + 1;
    return pd;
  };

  const breakdown: { from: string; to: string; days: number; ctc: number }[] = [];
  let basicSum = 0;
  let hraSum = 0;
  let specialSum = 0;

  for (const s of structures) {
    const fromDay = Math.max(monthStartDay, dayOfMonth(s.effectiveFrom));
    const toDay = Math.min(monthEndDay, s.effectiveTo ? dayOfMonth(s.effectiveTo) : monthEndDay);
    if (fromDay > toDay) continue;

    const days = toDay - fromDay + 1;
    const fraction = days / calDays;
    const hra = (s.basicSalary * s.hraPercentage) / 100;
    const segCtc = s.basicSalary + hra + s.specialAllowance;

    basicSum += s.basicSalary * fraction;
    hraSum += hra * fraction;
    specialSum += s.specialAllowance * fraction;
    breakdown.push({
      from: `${monthYyyyMm}-${String(fromDay).padStart(2, "0")}`,
      to: `${monthYyyyMm}-${String(toDay).padStart(2, "0")}`,
      days,
      ctc: segCtc * fraction,
    });
  }

  return {
    basicSalary: roundInr(basicSum),
    hra: roundInr(hraSum),
    specialAllowance: roundInr(specialSum),
    ctcMonthly: roundInr(basicSum + hraSum + specialSum),
    segmentDays: breakdown,
  };
}

export interface StatutoryParams {
  pfApplicable: boolean;
  pfEmployeeRate: number;
  pfEmployerRate: number;
  pfWageCeiling: number;
  esiApplicable: boolean;
  esiEmployeeRate: number;
  esiEmployerRate: number;
  esiWageCeiling: number;
}

export interface StatutoryComputed {
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
}

/**
 * Compute PF and ESI for one payroll cycle.
 *
 * PF base = min(basicSalary, pfWageCeiling). Standard Indian rule: 12% of basic,
 * capped at the wage ceiling (₹15,000 default). Both employee + employer contribute.
 *
 * ESI base = grossSalary. Applies only when gross ≤ esiWageCeiling (₹21,000 default).
 * Employee 0.75%, employer 3.25%. If gross > ceiling on the entry month the employee
 * stays out of ESI for the cycle.
 */
export function computeStatutory(
  basicSalary: number,
  grossSalary: number,
  params: StatutoryParams
): StatutoryComputed {
  let pfEmployee = 0;
  let pfEmployer = 0;
  if (params.pfApplicable) {
    const pfBase = Math.min(basicSalary, params.pfWageCeiling);
    pfEmployee = roundInr((pfBase * params.pfEmployeeRate) / 100);
    pfEmployer = roundInr((pfBase * params.pfEmployerRate) / 100);
  }

  let esiEmployee = 0;
  let esiEmployer = 0;
  if (params.esiApplicable && grossSalary <= params.esiWageCeiling) {
    esiEmployee = roundInr((grossSalary * params.esiEmployeeRate) / 100);
    esiEmployer = roundInr((grossSalary * params.esiEmployerRate) / 100);
  }

  return { pfEmployee, pfEmployer, esiEmployee, esiEmployer };
}

export function calendarDaysInMonth(monthYyyyMm: string): number {
  const [y, m] = monthYyyyMm.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

/**
 * Per-day rate uses full monthly salary (calendar days in month), matching payslip preview.
 * If monthly salary is missing, use gross so LOP is still proportional to earnings.
 */
export function perDaySalaryForLop(monthYyyyMm: string, monthlySalary: number, grossSalary: number): number {
  const days = calendarDaysInMonth(monthYyyyMm);
  if (days <= 0) return 0;
  const base = monthlySalary > 0 ? monthlySalary : grossSalary;
  return base / days;
}

export function rawLopDeduction(monthYyyyMm: string, monthlySalary: number, grossSalary: number, lopDays: number): number {
  const perDay = perDaySalaryForLop(monthYyyyMm, monthlySalary, grossSalary);
  return (lopDays || 0) * perDay;
}

export function rawHalfDayDeduction(
  monthYyyyMm: string,
  monthlySalary: number,
  grossSalary: number,
  halfDays: number
): number {
  const perDay = perDaySalaryForLop(monthYyyyMm, monthlySalary, grossSalary);
  return ((halfDays || 0) * perDay) / 2;
}

export function roundInr(value: number): number {
  return Math.round(value);
}

/** Monthly CTC split: Basic 50%, HRA 25%, Special Allowance 25% (rupees rounded). */
export function splitMonthlyCtc505025(ctcMonthly: number): {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
} {
  const ctc = roundInr(ctcMonthly);
  const basicSalary = roundInr(ctc * 0.5);
  const hra = roundInr(ctc * 0.25);
  const specialAllowance = roundInr(ctc - basicSalary - hra);
  return { basicSalary, hra, specialAllowance };
}

export function computeTotalDeductionsAndNet(params: {
  month: string;
  monthlySalary: number;
  grossSalary: number;
  salaryStructureDeductions: number;
  lopDays: number;
  halfDays: number;
  otherDeductions: number;
  professionalTax?: number;
}): {
  lopDeduction: number;
  halfDayDeduction: number;
  totalDeductions: number;
  netSalary: number;
} {
  const pt = params.professionalTax ?? PROFESSIONAL_TAX_INR;
  const rawLop = rawLopDeduction(
    params.month,
    params.monthlySalary,
    params.grossSalary,
    params.lopDays
  );
  const rawHalf = rawHalfDayDeduction(
    params.month,
    params.monthlySalary,
    params.grossSalary,
    params.halfDays
  );
  const totalDeductions = roundInr(
    (params.salaryStructureDeductions || 0) + rawLop + rawHalf + pt + (params.otherDeductions || 0)
  );
  const netSalary = roundInr(params.grossSalary - totalDeductions);
  return {
    lopDeduction: roundInr(rawLop),
    halfDayDeduction: roundInr(rawHalf),
    totalDeductions,
    netSalary,
  };
}

export interface PayslipPreviewInput {
  monthlySalary: number;
  month: string;
  lopDays: number;
  halfDays: number;
  otherDeductions: number;
  bonus: number;
  overtimeAmount: number;
  overtimeType: string;
  overtimeDays: number;
  overtimeHours: number;
  /** Optional non-standard breakdown (tests only). Default: {@link splitMonthlyCtc505025} on `monthlySalary`. */
  basicSalary?: number;
  hraPercentage?: number;
  allowances?: number;
  /** Optional recurring deductions from salary structure (PF, etc.) */
  salaryStructureDeductions?: number;
  /** Defaults to {@link PROFESSIONAL_TAX_INR} when omitted. */
  professionalTax?: number;
}

/** Same numbers shown in Generate sheet preview — use for payroll page `useMemo` */
export function buildPayslipPreviewFromEmployee(input: PayslipPreviewInput) {
  const monthlySalary = input.monthlySalary;
  const calendarDays = calendarDaysInMonth(input.month);
  const otAmt = input.overtimeAmount || 0;
  const bonusAmt = input.bonus || 0;
  const structDed = input.salaryStructureDeductions ?? 0;
  const pt = input.professionalTax ?? PROFESSIONAL_TAX_INR;

  let basicPay: number;
  let hra: number;
  let allowances: number;
  let grossSalary: number;

  if (input.basicSalary !== undefined) {
    basicPay = input.basicSalary;
    const hraPercentage = input.hraPercentage ?? 50;
    hra = roundInr((basicPay * hraPercentage) / 100);
    allowances = roundInr(input.allowances ?? 0);
    grossSalary = roundInr(basicPay + hra + allowances + bonusAmt + otAmt);
  } else {
    const split = splitMonthlyCtc505025(monthlySalary);
    basicPay = split.basicSalary;
    hra = split.hra;
    allowances = split.specialAllowance;
    grossSalary = roundInr(monthlySalary + bonusAmt + otAmt);
  }

  const { lopDeduction, halfDayDeduction, totalDeductions, netSalary } = computeTotalDeductionsAndNet({
    month: input.month,
    monthlySalary,
    grossSalary,
    salaryStructureDeductions: structDed,
    lopDays: input.lopDays,
    halfDays: input.halfDays,
    otherDeductions: input.otherDeductions,
    professionalTax: pt,
  });

  return {
    basicPay,
    hra,
    allowances,
    grossSalary,
    lopDeduction,
    halfDayDeduction,
    professionalTax: pt,
    otherDeductions: input.otherDeductions || 0,
    bonus: bonusAmt,
    overtimeAmount: otAmt,
    overtimeType: input.overtimeType,
    overtimeDays: input.overtimeDays,
    overtimeHours: input.overtimeHours,
    totalDeductions,
    netSalary,
    lopDays: input.lopDays,
    halfDays: input.halfDays,
    calendarDays,
    workingDays: calendarDays,
    effectiveDays: calendarDays - input.lopDays - input.halfDays * 0.5,
    salaryStructureDeductions: structDed,
  };
}
