export type PaySectionId =
  | "payslips" | "total-rewards" | "disciplinary" | "form16" | "salary"
  | "reimbursements" | "tax" | "loans" | "bank" | "fnf";

interface PaySectionAvailability {
  showSalary?: boolean;
  allowReimbursements?: boolean;
  allowTax?: boolean;
  showLoans?: boolean;
  allowBank?: boolean;
  showFnf?: boolean;
}

export function getPaySectionIds(availability: PaySectionAvailability): PaySectionId[] {
  const ids: PaySectionId[] = ["payslips", "total-rewards", "disciplinary", "form16"];
  if (availability.showSalary) ids.push("salary");
  if (availability.allowReimbursements) ids.push("reimbursements");
  if (availability.allowTax) ids.push("tax");
  if (availability.showLoans) ids.push("loans");
  if (availability.allowBank) ids.push("bank");
  if (availability.showFnf) ids.push("fnf");
  return ids;
}
