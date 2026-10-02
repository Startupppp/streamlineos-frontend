import { render, screen } from "@testing-library/react";

jest.mock("@/hooks/api/hr", () => ({
  useOnboardEmployee: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/hr/onboarding", () => ({
  useOnboardingTemplateDepartments: () => ({ data: [] }),
}));
jest.mock("@/hooks/api/org-hierarchy", () => ({
  useOrgLocations: () => ({ data: { data: [] } }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";

const STEP_LABELS = [
  "Personal",
  "Job Details",
  "Skills & Pay",
  "Banking",
  "Review",
] as const;

describe("onboarding step buttons keep an accessible name when their label is hidden", () => {
  it.each(STEP_LABELS)("%s is announced", (label) => {
    render(<OnboardingWizard />);

    const controls = screen.getAllByRole("button", { name: label });

    expect(
      controls.some((control) => control.getAttribute("aria-label") === label),
    ).toBe(true);
  });
});
