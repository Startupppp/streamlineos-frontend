import { onboardingFlowSessionContract } from "./onboarding-flow-schema";

describe("onboarding session wire contract", () => {
  const initial = {
    id: 0,
    orgId: "org-a",
    userId: "user-a",
    membershipId: 17,
    type: "employee_onboarding",
    status: "not_started",
    currentStep: null,
    completedSteps: [],
    skippedSteps: [],
    data: {},
    source: null,
    startedAt: null,
    completedAt: null,
  };

  it("accepts an unsaved initial session without durable timestamps", () => {
    expect(onboardingFlowSessionContract.safeParse(initial).success).toBe(true);
  });

  it("requires durable timestamps for a persisted session", () => {
    expect(onboardingFlowSessionContract.safeParse({ ...initial, id: 5 }).success).toBe(false);
  });
});
