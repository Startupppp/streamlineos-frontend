import type { PayrollReadiness } from "@/hooks/api/payroll/readiness-schema";

export type TourStep = {
  key: "directory" | "enable" | "eligibility" | "salary" | "close";
  title: string;
  hint: string;
  cta: string;
  href: string;
  done: boolean;
};

export type TourInputs = {
  people: PayrollReadiness["people"];
  hasRun: boolean;
  payrollOn: boolean;
  policyActive: boolean;
};

export function tourSteps({ people, hasRun, payrollOn, policyActive }: TourInputs): TourStep[] {
  return [
    {
      key: "directory",
      title: "Add people to the directory",
      hint: "Payroll pays people from your directory.",
      cta: "Open directory",
      href: "/directory",
      done: people.payable + people.needsPayeeLink + people.withSalary > 0,
    },
    {
      key: "enable",
      title: "Activate your payroll policy",
      hint: "Pick a template, pay day and statutory settings.",
      cta: "Finish setup",
      href: "/payroll/setup",
      done: payrollOn && policyActive,
    },
    {
      key: "eligibility",
      title: "Make people payable",
      hint: "Each person needs a member account or a payee worker record.",
      cta: "Review eligibility",
      href: "/payroll/employees",
      done: people.payable > 0,
    },
    {
      key: "salary",
      title: "Assign salaries",
      hint:
        people.payableWithoutSalary > 0
          ? `${people.payableWithoutSalary} payable ${people.payableWithoutSalary === 1 ? "person has" : "people have"} no salary yet.`
          : "Give every payable person an active salary profile.",
      cta: "Assign salaries",
      href: "/payroll/employees",
      done: people.payableWithoutSalary === 0 && people.withSalary > 0,
    },
    {
      key: "close",
      title: "Close this month",
      hint: "Check readiness, then start and approve the run.",
      cta: "Open readiness",
      href: "/payroll/readiness",
      done: hasRun,
    },
  ];
}
