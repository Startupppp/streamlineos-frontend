import { tourSteps, type TourInputs } from "./tour-steps";

const NO_PEOPLE: TourInputs["people"] = {
  payable: 0,
  withSalary: 0,
  payableWithoutSalary: 0,
  needsPayeeLink: 0,
  payableWithoutSalarySample: [],
};

function doneKeys(inputs: TourInputs): string[] {
  return tourSteps(inputs)
    .filter((step) => step.done)
    .map((step) => step.key);
}

describe("tourSteps", () => {
  it("has five steps and none done for an empty org with payroll not activated", () => {
    const steps = tourSteps({ people: NO_PEOPLE, hasRun: false, payrollOn: true, policyActive: false });
    expect(steps).toHaveLength(5);
    expect(steps.filter((step) => step.done)).toHaveLength(0);
  });

  it("sample data leaves salary as the honest open blocker: two payable people without salary", () => {
    const people = { ...NO_PEOPLE, payable: 5, withSalary: 3, payableWithoutSalary: 2 };
    const keys = doneKeys({ people, hasRun: false, payrollOn: true, policyActive: true });
    expect(keys).toEqual(["directory", "enable", "eligibility"]);
    const salary = tourSteps({ people, hasRun: false, payrollOn: true, policyActive: true }).find((s) => s.key === "salary");
    expect(salary?.hint).toBe("2 payable people have no salary yet.");
  });

  it("people who only need a payee link count as being in the directory but not as payable", () => {
    const keys = doneKeys({ people: { ...NO_PEOPLE, needsPayeeLink: 1 }, hasRun: false, payrollOn: true, policyActive: true });
    expect(keys).toEqual(["directory", "enable"]);
  });

  it("enable needs both the payroll module and an active policy", () => {
    expect(doneKeys({ people: NO_PEOPLE, hasRun: false, payrollOn: false, policyActive: true })).not.toContain("enable");
    expect(doneKeys({ people: NO_PEOPLE, hasRun: false, payrollOn: true, policyActive: true })).toContain("enable");
  });

  it("salary is not done when nobody has a salary, even with zero payable-without-salary", () => {
    expect(doneKeys({ people: NO_PEOPLE, hasRun: false, payrollOn: true, policyActive: true })).not.toContain("salary");
  });

  it("everything is done once all are salaried and this month's run exists", () => {
    const people = { ...NO_PEOPLE, payable: 5, withSalary: 5 };
    expect(doneKeys({ people, hasRun: true, payrollOn: true, policyActive: true })).toHaveLength(5);
  });
});
