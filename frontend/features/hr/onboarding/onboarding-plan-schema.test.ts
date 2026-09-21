import { ONBOARDING_PLAN_DEFAULTS, onboardingPlanSchema } from "./onboarding-plan-schema";

describe("an onboarding plan names its own fields in validation", () => {
  it("asks for the plan name, and for a title on the blank step, in those words", () => {
    const result = onboardingPlanSchema.safeParse(ONBOARDING_PLAN_DEFAULTS);
    expect(result.success).toBe(false);
    if (result.success) return;
    const messages = result.error.issues.map((issue) => [issue.path.join("."), issue.message]);
    expect(messages).toEqual([
      ["name", "Plan name is required"],
      ["steps.0.title", "Step title is required"],
    ]);
  });

  it("asks for at least one step when the list is empty", () => {
    const result = onboardingPlanSchema.safeParse({ ...ONBOARDING_PLAN_DEFAULTS, name: "Engineering", steps: [] });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual(["Add at least one step"]);
  });
});
