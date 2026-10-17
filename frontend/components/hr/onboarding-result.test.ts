import { describeOnboardingSuccess } from "./onboarding-result";

describe("describeOnboardingSuccess (PRD §7.2.7)", () => {
  it("names a selected manager plainly", () => {
    expect(describeOnboardingSuccess({ name: "Asha Rao", resolution: "SELECTED" })).toBe("Employee created. Reports to Asha Rao.");
  });

  it("says when the policy's default manager was assigned", () => {
    expect(describeOnboardingSuccess({ name: "Dana Default", resolution: "FALLBACK_CONFIGURED" })).toMatch(
      /Reports to Dana Default \(assigned by the default-manager policy/,
    );
  });

  it("says when the uploader was assigned", () => {
    expect(describeOnboardingSuccess({ name: "Hana HR", resolution: "FALLBACK_UPLOADER" })).toMatch(/assigned to you by the fallback policy/);
  });

  it("names the manager without the resolution for callers who may not see it", () => {
    expect(describeOnboardingSuccess({ name: "Asha Rao" })).toBe("Employee created. Reports to Asha Rao.");
  });

  it("handles a top-level employee with no manager", () => {
    expect(describeOnboardingSuccess(null)).toBe("Employee created");
  });
});
