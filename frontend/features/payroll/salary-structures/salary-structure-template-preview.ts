export type TemplatePreviewInput = {
  basicSalary: string;
  hraPercent: string;
  specialAllowance: string | null;
  medicalAllowance: string | null;
  travelAllowance: string | null;
  otherAllowances: string | null;
  pfDeductionPercent: string | null;
  professionalTax: string | null;
};

function num(value: string | null | undefined): number {
  const parsed = parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Blank basic, a negative component, or deductions that exceed gross, is not a
 * payable estimate.
 */
export function estimateTemplateNet(values: TemplatePreviewInput): {
  net: number;
  valid: boolean;
  hasNegativeComponent: boolean;
} {
  const basicBlank = values.basicSalary.trim() === "";
  const hasNegativeComponent = Object.values(values).some(
    (value) => num(value) < 0,
  );
  const basic = num(values.basicSalary);
  const hra = (basic * num(values.hraPercent)) / 100;
  const gross =
    basic +
    hra +
    num(values.specialAllowance) +
    num(values.medicalAllowance) +
    num(values.travelAllowance) +
    num(values.otherAllowances);
  const pf = (basic * num(values.pfDeductionPercent)) / 100;
  const net = gross - pf - num(values.professionalTax);
  return {
    net,
    valid: !basicBlank && !hasNegativeComponent && net >= 0,
    hasNegativeComponent,
  };
}
