export const DEFAULT_BASIC_PERCENT = 40;
export const DEFAULT_HRA_PERCENT = 50;
export const DEFAULT_PROFESSIONAL_TAX = 200;

export interface SalarySplit {
  basicPercent: number;
  hraPercent: number;
  professionalTax: number;
}

export const DEFAULT_SALARY_SPLIT: SalarySplit = {
  basicPercent: DEFAULT_BASIC_PERCENT,
  hraPercent: DEFAULT_HRA_PERCENT,
  professionalTax: DEFAULT_PROFESSIONAL_TAX,
};

export interface SalaryTemplateShape {
  basicSalary: string | null;
  hraPercent: string | null;
  specialAllowance?: string | null;
  medicalAllowance?: string | null;
  travelAllowance?: string | null;
  otherAllowances?: string | null;
  professionalTax?: string | null;
}

export function splitFromTemplate(template: SalaryTemplateShape): SalarySplit {
  const basic = Number(template.basicSalary ?? 0);
  const hraOfBasic = Number(template.hraPercent ?? 0);
  const allowances =
    Number(template.specialAllowance ?? 0) +
    Number(template.medicalAllowance ?? 0) +
    Number(template.travelAllowance ?? 0) +
    Number(template.otherAllowances ?? 0);
  const professionalTax = Number(
    template.professionalTax ?? DEFAULT_PROFESSIONAL_TAX,
  );

  const gross = basic + (basic * hraOfBasic) / 100 + allowances;
  if (!Number.isFinite(gross) || gross <= 0 || !Number.isFinite(basic) || basic <= 0)
    return DEFAULT_SALARY_SPLIT;

  return {
    basicPercent: (basic / gross) * 100,
    hraPercent: Number.isFinite(hraOfBasic) ? hraOfBasic : DEFAULT_HRA_PERCENT,
    professionalTax: Number.isFinite(professionalTax)
      ? professionalTax
      : DEFAULT_PROFESSIONAL_TAX,
  };
}

export interface SalaryBreakdown {
  basic: number;
  hra: number;
  balance: number;
  professionalTax: number;
  net: number;
}

export function applySalarySplit(
  monthlySalary: number,
  split: SalarySplit,
): SalaryBreakdown {
  const basic = (monthlySalary * split.basicPercent) / 100;
  const hra = (basic * split.hraPercent) / 100;
  return {
    basic,
    hra,
    balance: monthlySalary - basic - hra,
    professionalTax: split.professionalTax,
    net: monthlySalary - split.professionalTax,
  };
}
