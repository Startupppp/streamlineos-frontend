import { ordinal, PAY_DAY_OPTIONS, stepProfileSchema } from "./step-profile-schema";

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

describe("pay day ordinals (PAY-B-001) — 21th, 22th and 23th", () => {
  it("uses st, nd and rd after twenty and th for the teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 28, 31].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "28th", "31st",
    ]);
    expect(PAY_DAY_OPTIONS.find((o) => o.value === "22")?.label).toBe("22nd");
  });
});
