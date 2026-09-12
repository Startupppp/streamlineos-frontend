import { act, render, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { gateCookieName } from "@/lib/onboarding-gate";
import { SESSION_CLAIMS_UNCONFIRMED_MESSAGE } from "@/hooks/common/use-confirmed-session-claims-refresh";
import { DEFAULT_DATA } from "@/features/org-setup/lib/constants";

const mockSkipOrgSetup = jest.fn();
const mockSignIn = jest.fn();
const mockRefreshSessionClaims = jest.fn();
const mockClearAll = jest.fn();
const mockToastError = jest.fn();
const mockLocationReplace = jest.fn();

let capturedWelcomeProps: Record<string, unknown> = {};

jest.mock("@/features/org-setup/components/org-setup-shell", () => ({
  OrgSetupShell: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

jest.mock("@/features/org-setup/components/step-welcome", () => ({
  StepWelcome: (props: Record<string, unknown>) => {
    capturedWelcomeProps = props;
    return null;
  },
}));

jest.mock("@/features/org-setup/components/step-basics", () => ({
  StepBasics: () => null,
}));

jest.mock("@/features/org-setup/components/step-invite-launch", () => ({
  StepInviteLaunch: () => null,
}));

jest.mock("@/components/organization/archived-orgs-restore", () => ({
  ArchivedOrgsRestore: () => null,
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  signInWithMagicToken: jest.fn((...args: unknown[]) => mockSignIn(...args)),
  useSessionClaimsRefresh: jest.fn(() => mockRefreshSessionClaims),
}));

jest.mock("@/lib/api/hooks/org", () => ({
  useSkipOrgSetupMutation: jest.fn(() => ({ mutateAsync: mockSkipOrgSetup })),
  useOrgSetupSessionQuery: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/features/org-setup/lib/draft", () => ({
  loadDraft: jest.fn(() => ({ ...DEFAULT_DATA })),
  saveDraft: jest.fn(),
  loadStep: jest.fn(() => 1),
  saveStep: jest.fn(),
  clampStep: jest.fn(() => 1),
  hasDraftProgress: jest.fn(() => false),
  hasCompletionMarker: jest.fn(() => false),
  clearAll: jest.fn((...args: unknown[]) => mockClearAll(...args)),
}));

jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: "user-1", name: "Ada" }, orgId: null },
  })),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn((...args: unknown[]) => mockToastError(...args)),
    success: jest.fn(),
  },
}));

const SKIP_RESPONSE = {
  success: true as const,
  orgId: "org-new",
  autoLoginToken: "magic-token-abc",
};

const NEW_ORG_SESSION = {
  user: { id: "user-1", name: "Ada" },
  orgId: "org-new",
  expires: "2099-01-01",
};

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { replace: mockLocationReplace },
  });
});

beforeEach(() => {
  mockSkipOrgSetup.mockReset().mockResolvedValue(SKIP_RESPONSE);
  mockSignIn.mockReset().mockResolvedValue({ status: "signed-in" });
  mockRefreshSessionClaims.mockReset();
  mockClearAll.mockReset();
  mockToastError.mockReset();
  mockLocationReplace.mockReset();
  capturedWelcomeProps = {};
});

import OrgSetupPage from "@/app/org-setup/page";

async function renderWizard() {
  render(<OrgSetupPage />);
  await waitFor(() => {
    expect(typeof capturedWelcomeProps.onSkip).toBe("function");
  });
}

function skipHandler(): () => void {
  const handler = capturedWelcomeProps.onSkip;
  if (typeof handler !== "function")
    throw new Error("onSkip was not passed to StepWelcome");
  return handler as () => void;
}

async function clickSkip() {
  const handler = skipHandler();
  await act(async () => {
    handler();
    await Promise.resolve();
  });
}

describe("OrgSetupPage — skipping the wizard releases the dashboard only on a confirmed session", () => {
  it("asks for the provisioned org, writes the gate cookie and navigates", async () => {
    mockRefreshSessionClaims.mockResolvedValue(NEW_ORG_SESSION);
    await renderWizard();

    await clickSkip();

    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
    });
    expect(mockRefreshSessionClaims).toHaveBeenCalledWith({ orgId: "org-new" });
    expect(mockClearAll).toHaveBeenCalledWith("user-1");
    expect(document.cookie).toContain(
      gateCookieName("org-setup-done", "org-new"),
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("a timed-out refresh warns, leaves the draft alone and does not navigate", async () => {
    mockRefreshSessionClaims.mockResolvedValue(null);
    await renderWizard();

    await clickSkip();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
      );
    });
    expect(mockLocationReplace).not.toHaveBeenCalled();
    expect(mockClearAll).not.toHaveBeenCalled();
    expect(capturedWelcomeProps.isSkipping).toBe(false);
  });

  it("a session that does not name the provisioned org is refused", async () => {
    mockRefreshSessionClaims.mockResolvedValue({
      ...NEW_ORG_SESSION,
      orgId: "org-other",
    });
    await renderWizard();

    await clickSkip();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
      );
    });
    expect(mockLocationReplace).not.toHaveBeenCalled();
    expect(mockClearAll).not.toHaveBeenCalled();
  });

  it("a refresh that lands after a newer skip started is discarded in silence", async () => {
    let settleFirst: ((session: unknown) => void) | undefined;
    mockRefreshSessionClaims
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            settleFirst = resolve;
          }),
      )
      .mockResolvedValue(NEW_ORG_SESSION);
    await renderWizard();

    const handler = skipHandler();
    await act(async () => {
      handler();
      handler();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
    });

    await act(async () => {
      settleFirst?.(NEW_ORG_SESSION);
      await Promise.resolve();
    });

    expect(mockLocationReplace).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
