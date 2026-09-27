export type RunStartGate =
  | { action: "start" }
  | { action: "setup"; href: string; label: string; reason: string };

/** A run cannot start until the org has a payroll policy and at least one salary profile. */
export function payrollRunStartGate(input: {
  policyReady: boolean;
  employeeCount: number;
}): RunStartGate {
  if (!input.policyReady) {
    return {
      action: "setup",
      href: "/payroll/setup",
      label: "Set up payroll",
      reason: "Payroll is not set up yet.",
    };
  }
  if (input.employeeCount < 1) {
    return {
      action: "setup",
      href: "/payroll/employees",
      label: "Add salary profiles",
      reason: "Add at least one salary profile before starting a run.",
    };
  }
  return { action: "start" };
}
