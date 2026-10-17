import { policyFormSchema } from "./policy-form-types";

const VALID = {
  policyType: "leave" as const,
  name: "Standard leave",
  effectiveFrom: "2026-10-01",
  priority: 0,
  rules: {},
  scopes: [{ scopeType: "organization" as const, scopeValue: "" }],
};

describe("BUG-005 Create HR Policy refuses a name that is not there", () => {
  it("accepts a well-formed policy, so the rejections below are not passing on a schema that refuses everything", () => {
    expect(policyFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a blank name and says the name is required", () => {
    const parsed = policyFormSchema.safeParse({ ...VALID, name: "" });

    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("Name is required");
  });

  it("rejects a whitespace-only name, which min(1) alone accepted and stored as a nameless policy", () => {
    expect(policyFormSchema.safeParse({ ...VALID, name: "   " }).success).toBe(false);
  });

  it("rejects a name of only newlines and tabs, the other whitespace a paste can carry in", () => {
    expect(policyFormSchema.safeParse({ ...VALID, name: "\n\t " }).success).toBe(false);
  });

  it("still requires at least one scope, the other blocking requirement on this form", () => {
    expect(policyFormSchema.safeParse({ ...VALID, scopes: [] }).success).toBe(false);
  });
});
