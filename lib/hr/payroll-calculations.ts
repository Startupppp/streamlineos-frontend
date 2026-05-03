/** India payroll helpers — keep LOP / half-day / net aligned between preview UI and generate API */

export const PROFESSIONAL_TAX_INR = 200;

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
  /**
   * When provided (from salary_structures), component breakdown matches the generate route exactly.
   * When absent, fallback ratios are used: Basic=50%, HRA=50% of Basic, Allowance=remainder.
   */
  basicSalary?: number;
  hraPercentage?: number;
  allowances?: number;
  /** Optional recurring deductions from salary structure (PF, etc.) */
  salaryStructureDeductions?: number;
}

/** Same numbers shown in Generate sheet preview — use for payroll page `useMemo` */
export function buildPayslipPreviewFromEmployee(input: PayslipPreviewInput) {
  const monthlySalary = input.monthlySalary;
  const calendarDays = calendarDaysInMonth(input.month);
  const otAmt = input.overtimeAmount || 0;
  const bonusAmt = input.bonus || 0;
  const structDed = input.salaryStructureDeductions ?? 0;

  let basicPay: number;
  let hra: number;
  let allowances: number;
  let grossSalary: number;

  if (input.basicSalary !== undefined) {
    basicPay = input.basicSalary;
    const hraPercentage = input.hraPercentage ?? 50;
    hra = (basicPay * hraPercentage) / 100;
    allowances = input.allowances ?? 0;
    grossSalary = basicPay + hra + allowances + bonusAmt + otAmt;
  } else {
    basicPay = monthlySalary * 0.5;
    hra = basicPay * 0.5;
    allowances = monthlySalary - basicPay - hra;
    grossSalary = monthlySalary + bonusAmt + otAmt;
  }

  const { lopDeduction, halfDayDeduction, totalDeductions, netSalary } = computeTotalDeductionsAndNet({
    month: input.month,
    monthlySalary,
    grossSalary,
    salaryStructureDeductions: structDed,
    lopDays: input.lopDays,
    halfDays: input.halfDays,
    otherDeductions: input.otherDeductions,
  });

  return {
    basicPay,
    hra,
    allowances,
    grossSalary,
    lopDeduction,
    halfDayDeduction,
    professionalTax: PROFESSIONAL_TAX_INR,
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
  };
}
