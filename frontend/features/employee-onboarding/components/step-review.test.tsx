import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { gateCookieName } from "@/lib/onboarding-gate";
import { SESSION_CLAIMS_UNCONFIRMED_MESSAGE } from "@/hooks/common/use-confirmed-session-claims-refresh";
import { DATA_STEP_IDS } from "../lib/constants";
import type { WizardDraft } from "../lib/wizard-draft-schema";

const mockSavePersonal = jest.fn();
const mockSaveBank = jest.fn();
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
  useBankDetailsMutation: () => ({ mutateAsync: mockSaveBank }),
  usePersonalInfoMutation: () => ({ mutateAsync: mockSavePersonal }),
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

const REFRESHED_SESSION = {
  user: { id: "user-1", name: "Ada Lovelace" },
  orgId: "org-acme",
  expires: "2099-01-01",
};

const GATE_SCOPE = "user-1--org-acme";

beforeEach(() => {
  mockSavePersonal.mockReset().mockResolvedValue(undefined);
  mockSaveBank.mockReset().mockResolvedValue(undefined);
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
    />,
  );
}

async function submitReview() {
  const user = userEvent.setup();
  renderReview();
  await user.click(screen.getByRole("button", { name: /confirm & submit/i }));
}

describe("StepReview — the celebration waits for a session that still names the org", () => {
  it("submits, writes the scoped gate cookie and celebrates on a confirmed refresh", async () => {
    mockRefreshSessionClaims.mockResolvedValue(REFRESHED_SESSION);

    await submitReview();

    await waitFor(() => {
      expect(screen.getByTestId("celebration")).toBeInTheDocument();
    });
    expect(mockSubmitOnboarding).toHaveBeenCalledTimes(1);
    expect(mockRefreshSessionClaims).toHaveBeenCalledWith({ orgId: "org-acme" });
    expect(document.cookie).toContain(
      gateCookieName("onboarding-done", GATE_SCOPE),
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("a timed-out refresh warns instead of celebrating", async () => {
    mockRefreshSessionClaims.mockResolvedValue(null);

    await submitReview();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
      );
    });
    expect(screen.queryByTestId("celebration")).toBeNull();
  });

  it("a session that names a different org is refused", async () => {
    mockRefreshSessionClaims.mockResolvedValue({
      ...REFRESHED_SESSION,
      orgId: "org-other",
    });

    await submitReview();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
      );
    });
    expect(screen.queryByTestId("celebration")).toBeNull();
  });

  it("a member with no active org asserts nothing but still needs a session back", async () => {
    sessionState.data.orgId = null;
    mockRefreshSessionClaims.mockResolvedValue({
      ...REFRESHED_SESSION,
      orgId: "org-acme",
    });

    await submitReview();

    await waitFor(() => {
      expect(screen.getByTestId("celebration")).toBeInTheDocument();
    });
    expect(mockRefreshSessionClaims).toHaveBeenCalledWith(undefined);
  });

  it("a second submit while the refresh is in flight starts no second run, so the first still lands", async () => {
    let settleFirst: ((session: unknown) => void) | undefined;
    mockRefreshSessionClaims.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          settleFirst = resolve;
        }),
    );

    const user = userEvent.setup();
    renderReview();
    const submit = screen.getByRole("button", { name: /confirm & submit/i });
    await user.click(submit);
    await waitFor(() => {
      expect(mockRefreshSessionClaims).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId("celebration")).toBeNull();

    await user.click(submit);
    expect(mockSubmitOnboarding).toHaveBeenCalledTimes(1);

    await act(async () => {
      settleFirst?.(REFRESHED_SESSION);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("celebration")).toBeInTheDocument();
    });
    expect(mockRefreshSessionClaims).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
