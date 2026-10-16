import { componentRole, duplicatedRoles } from "./component-role";

describe("component roles (UX-R2-4) — two basics, two HRA, two PF and two PT were active and nothing said so", () => {
  it("flags the roles that more than one component fills", () => {
    const duplicates = duplicatedRoles([
      { code: "BASIC", name: "Basic Salary", type: "EARNING" },
      { code: "QA1015BASIC", name: "QA1015 Basic", type: "EARNING" },
      { code: "PT", name: "Professional Tax", type: "DEDUCTION" },
      { code: "QA1015PT", name: "QA1015 Prof Tax", type: "DEDUCTION" },
      { code: "HRA", name: "House Rent Allowance", type: "EARNING" },
    ]);
    expect([...duplicates].sort()).toEqual(["Basic", "Professional Tax"]);
  });

  it("gives no role to a special allowance or a voluntary PF", () => {
    expect(componentRole({ code: "SPECIAL", name: "Special Allowance", type: "EARNING" })).toBeNull();
    expect(componentRole({ code: "VPF", name: "Voluntary Provident Fund", type: "DEDUCTION" })).toBeNull();
  });
});
