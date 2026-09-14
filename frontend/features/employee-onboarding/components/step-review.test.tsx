import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { gateCookieName } from "@/lib/onboarding-gate";
import { DATA_STEP_IDS } from "../lib/constants";
import type { WizardDraft } from "../lib/wizard-draft-schema";

const mockSubmitOnboarding = jest.fn();
const mockRefreshSessionClaims = jest.fn();
const mockToastError = jest.fn();

const sessionState = {
  data: {
    user: {
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@acme.test",
      role: "ENGINEERING",
    },
    orgId: "org-acme" as string | null,
  },
};

jest.mock("next-auth/react", () => ({
  useSession: () => sessionState,
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn((...args: unknown[]) => mockToastError(...args)),
  },
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useSessionClaimsRefresh: () => mockRefreshSessionClaims,
}));

jest.mock("@/lib/api/hooks/onboarding", () => ({
  useSubmitOnboardingMutation: () => ({ mutateAsync: mockSubmitOnboarding }),
}));

jest.mock("../hooks/use-onboarding-requirements", () => ({
  useOnboardingRequirements: () => ({ data: undefined }),
}));

jest.mock("@/components/celebration/completion-celebration", () => ({
  CompletionCelebration: () => <div data-testid="celebration" />,
}));

import { StepReview } from "./step-review";

const DRAFT: WizardDraft = {
  personal: {
    phone: "+919876543210",
    gender: "FEMALE",
    dateOfBirth: "1990-04-12",
    addressLine1: "",
    addressCity: "",
    addressState: "",
    addressPostalCode: "",
    addressCountry: "",
    emergencyName: "Grace Hopper",
    emergencyRelation: "Parent",
    emergencyPhone: "+919812345678",
  },
  bank: {
    countryCode: "IN",
    accountHolder: "Ada Lovelace",
    bankName: "Acme Bank",
    accountNumber: "123456789012",
    routingCode: "ACME0001234",
    iban: "",
    swift: "",
    statutory: {},
  },
};

const GATE_SCOPE = "user-1--org-acme";

beforeEach(() => {
  mockSubmitOnboarding.mockReset().mockResolvedValue(undefined);
  mockRefreshSessionClaims.mockReset();
  mockToastError.mockReset();
  sessionState.data.orgId = "org-acme";
  document.cookie = `${gateCookieName("onboarding-done", GATE_SCOPE)}=; path=/; max-age=0; SameSite=Lax`;
});

function renderReview() {
  render(
    <StepReview
      completedSteps={new Set(DATA_STEP_IDS)}
      draft={DRAFT}
      onBack={jest.fn()}
      onEditPersonal={jest.fn()}
      onEditBank={jest.fn()}
      onClearDraft={jest.fn()}
    />,
  );
}

async function submitReview() {
  const user = userEvent.setup();
  renderReview();
  await user.click(screen.getByRole("button", { name: /confirm & submit/i }));
}

describe("StepReview — submitting writes the gate cookie and shows the celebration immediately", () => {
  it("celebrates without waiting for the claims refresh, and still starts it so the JWT outlives the 5-minute cookie", async () => {
    mockRefreshSessionClaims.mockImplementation(() => new Promise(() => {}));

    await submitReview();

    await waitFor(() => {
      expect(screen.getByTestId("celebration")).toBeInTheDocument();
    });
    expect(mockSubmitOnboarding).toHaveBeenCalledTimes(1);
    expect(mockRefreshSessionClaims).toHaveBeenCalledTimes(1);
    expect(document.cookie).toContain(
      gateCookieName("onboarding-done", GATE_SCOPE),
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("a member with no active org uses a null scope and still celebrates immediately", async () => {
    sessionState.data.orgId = null;

    await submitReview();

    await waitFor(() => {
      expect(screen.getByTestId("celebration")).toBeInTheDocument();
    });
    expect(mockRefreshSessionClaims).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("a submit API error surfaces the error toast and does not show celebration", async () => {
    mockSubmitOnboarding.mockRejectedValue(new Error("Server error"));

    await submitReview();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("celebration")).toBeNull();
    expect(mockRefreshSessionClaims).not.toHaveBeenCalled();
  });

  it("a second submit while the first is in flight starts no second run, so the first still lands", async () => {
    let settleSubmit: (() => void) | undefined;
    mockSubmitOnboarding.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          settleSubmit = resolve;
        }),
    );

    const user = userEvent.setup();
    renderReview();
    const submit = screen.getByRole("button", { name: /confirm & submit/i });
    await user.click(submit);

    expect(screen.queryByTestId("celebration")).toBeNull();
    await user.click(submit);
    expect(mockSubmitOnboarding).toHaveBeenCalledTimes(1);

    await act(async () => {
      settleSubmit?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("celebration")).toBeInTheDocument();
    });
    expect(mockRefreshSessionClaims).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
