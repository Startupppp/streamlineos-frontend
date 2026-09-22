import { emptyPolicyDefaults, policyFormValues, policySchema } from "./policy-schema";

describe("the leave policy form accepts the defaults it displays", () => {
  it("passes validation with the displayed name and accrual rate once a leave type is chosen", () => {
    const result = policySchema.safeParse({ ...emptyPolicyDefaults, leaveTypeId: "3", effectiveFrom: "2026-10-01" });
    expect(result.success).toBe(true);
  });

  it("loads an existing policy into the form for editing", () => {
    expect(
      policyFormValues({
        id: 9,
        orgId: "org_1",
        leaveTypeId: 3,
        name: "Sick leave policy",
        accrualType: "MONTHLY",
        accrualRate: "1.5",
        maxBalance: null,
        carryForwardDays: "5",
        encashable: true,
        probationRestricted: false,
        appliesTo: "ALL",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      name: "Sick leave policy",
      leaveTypeId: "3",
      accrualType: "MONTHLY",
      accrualRate: "1.5",
      maxBalance: "",
      carryForwardDays: "5",
      encashable: true,
      probationRestricted: false,
      effectiveFrom: "2026-01-01",
    });
  });
});
