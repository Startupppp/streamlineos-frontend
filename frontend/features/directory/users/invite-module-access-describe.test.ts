import { describeModuleAccess } from "./invite-module-access";

describe("an invitation row names the access its preset granted, not only the org standing", () => {
  it("names the preset when the grants match one exactly", () => {
    expect(describeModuleAccess([{ moduleKey: "hr", standing: "ADMIN" }])).toBe("HR Admin");
    expect(describeModuleAccess([{ moduleKey: "hr", standing: "MEMBER" }])).toBe("Manager");
    expect(
      describeModuleAccess([
        { moduleKey: "accounting", standing: "ADMIN" },
        { moduleKey: "payroll", standing: "ADMIN" },
      ]),
    ).toBe("Finance");
  });

  it("lists the grants when they match no preset", () => {
    expect(describeModuleAccess([{ moduleKey: "payroll", standing: "MEMBER" }])).toMatch(/Member$/);
  });

  it("says nothing when the invitation carries no module grants", () => {
    expect(describeModuleAccess([])).toBeNull();
  });
});
