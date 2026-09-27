import { stepProfileSchema } from "./step-profile-schema";

const ready = {
  country: "IN",
  currency: "INR",
  payFrequency: "MONTHLY" as const,
  payDay: "1",
  startMonth: "2026-04",
  legalEntityName: "Acme Pvt Ltd",
};

describe("payroll setup step 1", () => {
  it("blocks continue when country, legal entity, or start month is blank", () => {
    expect(stepProfileSchema.safeParse({ ...ready, country: "" }).success).toBe(false);
    expect(stepProfileSchema.safeParse({ ...ready, legalEntityName: "  " }).success).toBe(false);
    expect(stepProfileSchema.safeParse({ ...ready, startMonth: "" }).success).toBe(false);
    expect(stepProfileSchema.safeParse(ready).success).toBe(true);
  });
});
