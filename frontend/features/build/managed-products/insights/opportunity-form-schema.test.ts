import { acceptSchema } from "./opportunity-accept-schema";
import {
  createOpportunityFormSchema,
  overrideFormSchema,
  riceFormSchema,
} from "./opportunity-rice-schema";

describe("Manage Product opportunity form validation parity", () => {
  it("rejects score values the API rejects", () => {
    const valid = {
      reach: "0",
      reachPeriod: "quarter" as const,
      impact: 1,
      confidence: 0.8,
      effort: 1,
      effortUnit: "person_weeks" as const,
      expectedScoreVersion: 0,
    };

    expect(riceFormSchema.safeParse(valid).success).toBe(true);
    expect(riceFormSchema.safeParse({ ...valid, reach: "not-a-number" }).success).toBe(false);
    expect(riceFormSchema.safeParse({ ...valid, reach: "-1" }).success).toBe(false);
    expect(riceFormSchema.safeParse({ ...valid, reachUnit: "x".repeat(101) }).success).toBe(false);
  });

  it("applies the API bounds to overrides and acceptance", () => {
    expect(overrideFormSchema.safeParse({ overrideScore: -1, reason: "valid reason", expectedScoreVersion: 0 }).success).toBe(false);
    expect(overrideFormSchema.safeParse({ overrideScore: 1, reason: "no", expectedScoreVersion: 0 }).success).toBe(false);
    expect(acceptSchema.safeParse({ horizon: "next", expectedVersion: 1, dependsOnIds: Array.from({ length: 21 }, (_, i) => i + 1) }).success).toBe(false);
    expect(acceptSchema.safeParse({ horizon: "next", expectedVersion: 0 }).success).toBe(false);
  });

  it("trims opportunity text before submission validation", () => {
    const parsed = createOpportunityFormSchema.parse({ title: "  Checkout friction  ", theme: "  onboarding  " });
    expect(parsed).toEqual({ title: "Checkout friction", theme: "onboarding" });
  });
});
