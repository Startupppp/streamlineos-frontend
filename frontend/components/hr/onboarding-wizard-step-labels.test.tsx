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

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "u1" }, orgId: "o1" },
    status: "authenticated",
  }),
}));

jest.mock("@/components/hr/_onboarding/wizard-draft", () => ({
  loadAdminWizardDraft: () => null,
  saveAdminWizardDraft: jest.fn(),
  clearAdminWizardDraft: jest.fn(),
  toAdminWizardDraft: (values: Record<string, unknown>, step: number) => ({ ...values, step }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";

const STEP_LABELS = [
  "Personal",
  "Job Details",
  "Pay setup (optional)",
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
