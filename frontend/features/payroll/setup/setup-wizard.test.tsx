import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
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
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}));
let policyStatus: string | null = null;
let savedStep = 1;
const mockReplace = jest.fn();
jest.mock("sonner", () => ({ toast: { info: jest.fn() } }));
jest.mock("@/hooks/api/payroll", () => ({
  usePayrollPolicyCurrent: () =>
    policyStatus
      ? { data: { policy: { status: policyStatus } }, isLoading: false }
      : { data: undefined, isLoading: true },
}));
jest.mock("./lib/draft", () => ({
  loadDraft: (id: string) => mockLoadDraft(id),
  loadStep: () => savedStep,
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
jest.mock("./steps/step-activate", () => ({
  StepActivate: ({ onActivated }: { onActivated: () => void }) => (
    <button type="button" onClick={onActivated}>Activate</button>
  ),
}));

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

describe("SetupWizard activation (PAY-B-015) — said 'already active' right after this wizard activated", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    jest.mocked(toast.info).mockClear();
  });

  it("does not redirect or toast once this wizard activated the policy", () => {
    savedStep = 5;
    policyStatus = null;
    const { rerender } = render(<SetupWizard />);
    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    policyStatus = "ACTIVE";
    rerender(<SetupWizard />);
    expect(toast.info).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("still redirects a visitor whose policy was already active", () => {
    savedStep = 1;
    policyStatus = "ACTIVE";
    render(<SetupWizard />);
    expect(toast.info).toHaveBeenCalledWith("Payroll is already active. Redirecting to settings…");
    expect(mockReplace).toHaveBeenCalledWith("/payroll/settings");
  });
});
