import { payrollRunStartGate } from "./run-start-gate";

describe("payrollRunStartGate", () => {
  it("routes an unset org to setup instead of starting a run", () => {
    expect(payrollRunStartGate({ policyReady: false, employeeCount: 0 })).toEqual({
      action: "setup",
      href: "/payroll/setup",
      label: "Set up payroll",
      reason: "Payroll is not set up yet.",
    });
  });

  it("routes a ready policy with no profiles to employees", () => {
    expect(payrollRunStartGate({ policyReady: true, employeeCount: 0 }).action).toBe("setup");
  });

  it("allows a start once setup and a profile exist", () => {
    expect(payrollRunStartGate({ policyReady: true, employeeCount: 1 })).toEqual({ action: "start" });
  });
});
