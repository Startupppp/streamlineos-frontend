import { PERMISSIONS } from "../roles";
import { CATALOG } from "@/components/rbac/permission-matrix-types";

const PAYROLL_KEY_PATTERN = /^payroll:/;

describe("payroll permission catalog", () => {
  it("has a grantable catalog entry for every payroll:* permission the backend guards enforce", () => {
    const expectedResources = [
      "payroll:runs",
      "payroll:salaries",
      "payroll:templates",
      "payroll:policies",
      "payroll:components",
      "payroll:payslips",
      "payroll:bank",
      "payroll:tax",
      "payroll:reports",
      "payroll:accounting",
      "payroll:settings",
      "payroll:fnf",
    ];

    for (const resource of expectedResources) {
      const matches = PERMISSIONS.filter((p) => p.resource === resource);
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  it("exposes a dedicated Payroll module in the Roles UI catalog", () => {
    const payrollModule = CATALOG.find((m) => m.moduleKey === "payroll");
    expect(payrollModule).toBeDefined();
    expect(payrollModule?.perms.length).toBeGreaterThan(0);
    expect(
      payrollModule?.perms.every((p) => PAYROLL_KEY_PATTERN.test(p.name)),
    ).toBe(true);
  });

  it("has no duplicate permission names across the aggregated catalog", () => {
    const names = PERMISSIONS.map((p) => p.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});
