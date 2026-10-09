import { render, screen } from "@testing-library/react";
import { SetupWizard } from "./setup-wizard";

let orgId = "org-a";
const mockLoadDraft = jest.fn((id: string) => ({
  profile: { country: id === "org-a" ? "IN" : "US" },
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId } }),
}));
jest.mock("@/hooks/common/use-hydrated", () => ({ useHydrated: () => true }));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/hooks/api/payroll", () => ({
  usePayrollPolicyCurrent: () => ({ data: undefined, isLoading: true }),
}));
jest.mock("./lib/draft", () => ({
  loadDraft: (id: string) => mockLoadDraft(id),
  loadStep: () => 1,
  saveDraft: jest.fn(),
  saveStep: jest.fn(),
  clearAll: jest.fn(),
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("./wizard-shell", () => ({
  WizardShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("./steps/step-profile", () => ({
  StepProfile: ({ draft }: { draft: { profile?: { country?: string } } }) => (
    <div>Country: {draft.profile?.country}</div>
  ),
}));
jest.mock("./steps/step-template", () => ({ StepTemplate: () => null }));
jest.mock("./steps/step-toggles", () => ({ StepToggles: () => null }));
jest.mock("./steps/step-review", () => ({ StepReview: () => null }));
jest.mock("./steps/step-activate", () => ({ StepActivate: () => null }));

describe("SetupWizard organization identity", () => {
  it("remounts org-scoped draft state when the active organization changes", () => {
    orgId = "org-a";
    const { rerender } = render(<SetupWizard />);
    expect(screen.getByText("Country: IN")).toBeInTheDocument();

    orgId = "org-b";
    rerender(<SetupWizard />);
    expect(screen.getByText("Country: US")).toBeInTheDocument();
    expect(mockLoadDraft).toHaveBeenCalledWith("org-b");
  });
});
