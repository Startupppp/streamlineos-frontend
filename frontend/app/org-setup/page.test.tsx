import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
const mockSetAutoSignOutSuppressed = jest.fn();
const mockSignOut = jest.fn();
const mockUseOrgSetupSessionQuery = jest.fn((_enabled: boolean) => ({
  data: undefined,
}));

let capturedWelcomeProps: Record<string, unknown> = {};

let capturedShellData: { fullName?: string } | null = null;

jest.mock("@/features/org-setup/components/org-setup-shell", () => ({
  OrgSetupShell: ({
    children,
    data,
  }: PropsWithChildren & { data?: { fullName?: string } }) => {
    capturedShellData = data ?? null;
    return <div>{children}</div>;
  },
}));

jest.mock("@/features/org-setup/components/step-welcome", () => ({
  StepWelcome: (props: Record<string, unknown>) => {
    capturedWelcomeProps = props;
    return null;
  },
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
  useMyPendingInvitations: jest.fn(() => ({ data: [] })),
  useClaimInvitation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useSignOut: jest.fn(() => ({ mutate: mockSignOut, isPending: false })),
}));

jest.mock("@/hooks/common/use-confirmed-session-claims-refresh", () => ({
  SESSION_CLAIMS_UNCONFIRMED_MESSAGE:
    "Your session could not be refreshed. Reload the page before continuing.",
  useConfirmedSessionClaimsRefresh: () => () => ({
    confirm: async (expected: { orgId?: string } | undefined) => {
      const session = await mockRefreshSessionClaims(expected);
      if (!session) return { status: "unavailable" };
      if (expected?.orgId !== undefined && session.orgId !== expected.orgId)
        return { status: "unconfirmed" };
      return { status: "confirmed", session };
    },
  }),
}));

jest.mock("@/hooks/api/org-setup", () => ({
  useSkipOrgSetupMutation: jest.fn(() => ({ mutateAsync: mockSkipOrgSetup })),
  useOrgSetupSessionQuery: jest.fn((enabled: boolean) =>
    mockUseOrgSetupSessionQuery(enabled),
  ),
  useOrgSetupDraftQuery: jest.fn(() => ({ data: undefined, isFetched: false })),
  useOrgSetupDraftSaveMutation: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));

jest.mock("@/features/org-setup/lib/draft", () => ({
  loadDraft: jest.fn(() => ({ ...DEFAULT_DATA })),
  saveDraft: jest.fn(),
  loadStep: jest.fn(() => 1),
  saveStep: jest.fn(),
  clampStep: jest.fn(() => 1),
  reachableStep: jest.fn((step: number) => step),
  hasDraftProgress: jest.fn(() => false),
  hasCompletionMarker: jest.fn(() => false),
  clearAll: jest.fn((...args: unknown[]) => mockClearAll(...args)),
}));

jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: jest.fn(),
  setAutoSignOutSuppressed: (...args: unknown[]) => mockSetAutoSignOutSuppressed(...args),
}));

const mockUseSession = jest.fn<unknown, unknown[]>(() => ({
  data: { user: { id: "user-1", name: "Ada" }, orgId: null },
}));

jest.mock("next-auth/react", () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
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
  mockSetAutoSignOutSuppressed.mockReset();
  mockUseOrgSetupSessionQuery.mockClear();
  capturedWelcomeProps = {};
  capturedShellData = null;
  mockUseSession.mockReset().mockReturnValue({
    data: { user: { id: "user-1", name: "Ada" }, orgId: null },
  });
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
  it("does not request the server draft before local progress is checked", async () => {
    await renderWizard();

    expect(mockUseOrgSetupSessionQuery.mock.calls[0]?.[0]).toBe(false);
  });

  it("asks for the provisioned org, writes the gate cookie and navigates", async () => {
    mockRefreshSessionClaims.mockResolvedValue(NEW_ORG_SESSION);
    await renderWizard();

    await clickSkip();

    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
    });
    expect(mockRefreshSessionClaims).toHaveBeenCalledWith({ orgId: "org-new" });
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockClearAll).toHaveBeenCalledWith("user-1");
    expect(document.cookie).toContain(
      gateCookieName("org-setup-done", "org-new"),
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("a timed-out refresh warns, leaves the draft alone and does not navigate", async () => {
    mockSkipOrgSetup.mockResolvedValue({ ...SKIP_RESPONSE, autoLoginToken: undefined });
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
    mockSkipOrgSetup.mockResolvedValue({ ...SKIP_RESPONSE, autoLoginToken: undefined });
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

    expect(mockSkipOrgSetup).toHaveBeenCalledTimes(1);
    expect(mockLocationReplace).not.toHaveBeenCalled();

    await act(async () => {
      settleFirst?.(NEW_ORG_SESSION);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
    });
    expect(mockLocationReplace).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});


describe("OrgSetupPage — auto sign-out suppression", () => {
  it("suppresses auto sign-out for the page lifetime and restores it on unmount", async () => {
    const { unmount } = render(<OrgSetupPage />);
    await waitFor(() => {
      expect(mockSetAutoSignOutSuppressed).toHaveBeenCalledWith(true);
    });

    unmount();

    expect(mockSetAutoSignOutSuppressed).toHaveBeenCalledWith(false);
  });
});

describe("OrgSetupPage — pending invitation banner", () => {
  const { useMyPendingInvitations, useClaimInvitation } = jest.requireMock(
    "@/hooks/common/auth-hooks",
  ) as {
    useMyPendingInvitations: jest.Mock;
    useClaimInvitation: jest.Mock;
  };

  const { useOrgSetupDraftQuery, useOrgSetupSessionQuery } = jest.requireMock(
    "@/hooks/api/org-setup",
  ) as {
    useOrgSetupDraftQuery: jest.Mock;
    useOrgSetupSessionQuery: jest.Mock;
  };

  function withInvitations(mutate = jest.fn()) {
    useMyPendingInvitations.mockReturnValue({
      data: [{ id: "inv-1", organizationName: "Acme Corp", role: "Member" }],
      isPending: false,
    });
    useClaimInvitation.mockReturnValue({ mutate, isPending: false });
    useOrgSetupDraftQuery.mockReturnValue({ data: undefined, isFetched: true });
    useOrgSetupSessionQuery.mockReturnValue({ data: undefined, isFetched: true });
  }

  beforeEach(() => {
    useMyPendingInvitations.mockReturnValue({ data: [], isPending: false });
    useOrgSetupDraftQuery.mockReturnValue({ data: undefined, isFetched: true });
    useOrgSetupSessionQuery.mockReturnValue({ data: undefined, isFetched: true });
  });

  it("renders the invite banner when pending invitations are present", async () => {
    withInvitations();
    render(<OrgSetupPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /pending invitation/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create my own organization/i })).toBeInTheDocument();
  });

  it("signs the user out from the pending invitation view (B-022)", async () => {
    mockSignOut.mockClear();
    withInvitations();
    render(<OrgSetupPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("shows the sign-out in progress on the button itself (B-022, FE-80)", async () => {
    const { useSignOut } = jest.requireMock("@/hooks/common/auth-hooks");
    useSignOut.mockReturnValue({ mutate: mockSignOut, isPending: true });
    withInvitations();
    render(<OrgSetupPage />);

    const signingOut = await screen.findByRole("button", { name: /Signing out/ });
    expect(signingOut).toBeDisabled();
    expect(signingOut).toHaveAttribute("aria-busy", "true");
    useSignOut.mockReturnValue({ mutate: mockSignOut, isPending: false });
  });

  it("calls claimMutation.mutate with the invitation id when Join is clicked", async () => {
    const mutate = jest.fn();
    withInvitations(mutate);
    render(<OrgSetupPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Join" }));

    expect(mutate).toHaveBeenCalledWith(
      "inv-1",
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("disables the Join button while a claim is in flight", async () => {
    const mutate = jest.fn();
    withInvitations(mutate);
    render(<OrgSetupPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Join" }));

    expect(screen.getByRole("button", { name: "Joining…" })).toBeDisabled();
  });

  it("B-022: clicking Join claims the invite, signs in with the returned token and lands on /post-invite", async () => {
    let capturedOnSuccess: ((data: unknown) => Promise<void>) | undefined;
    const mutate = jest.fn((_id: string, opts: { onSuccess: (data: unknown) => Promise<void> }) => {
      capturedOnSuccess = opts.onSuccess;
    });
    withInvitations(mutate);
    render(<OrgSetupPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Join" }));
    expect(mutate).toHaveBeenCalledWith("inv-1", expect.anything());
    await act(async () => {
      await capturedOnSuccess?.({ ok: true, autoLoginToken: "claim-token", skippedGrants: [] });
    });

    expect(mockSignIn).toHaveBeenCalledWith("claim-token");
    expect(window.location.href).toBe("/post-invite");
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("shows an error toast and re-enables the button when the claim fails", async () => {
    let capturedOnError: ((error: unknown) => void) | undefined;
    const mutate = jest.fn((_id: string, opts: { onError: (e: unknown) => void }) => {
      capturedOnError = opts.onError;
    });
    withInvitations(mutate);
    render(<OrgSetupPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Join" }));
    act(() => { capturedOnError?.(new Error("Forbidden")); });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
    expect(screen.getByRole("button", { name: "Join" })).toBeEnabled();
  });
});

describe("OrgSetupPage — session name seeds fullName once", () => {
  it("seeds fullName from session name when draft fullName is empty", async () => {
    const { loadDraft } = jest.requireMock("@/features/org-setup/lib/draft") as {
      loadDraft: jest.Mock;
    };
    loadDraft.mockReturnValue({ ...DEFAULT_DATA, fullName: "" });
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Ada Lovelace" }, orgId: null },
    });

    await renderWizard();

    await waitFor(() => {
      expect(capturedShellData?.fullName).toBe("Ada Lovelace");
    });
  });

  it("does not overwrite an existing user/draft fullName", async () => {
    const { loadDraft } = jest.requireMock("@/features/org-setup/lib/draft") as {
      loadDraft: jest.Mock;
    };
    loadDraft.mockReturnValue({ ...DEFAULT_DATA, fullName: "Draft Owner" });
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Ada Lovelace" }, orgId: null },
    });

    await renderWizard();

    await waitFor(() => {
      expect(capturedShellData?.fullName).toBe("Draft Owner");
    });
  });

  it("leaves fullName empty when session has no name so BE can derive", async () => {
    const { loadDraft } = jest.requireMock("@/features/org-setup/lib/draft") as {
      loadDraft: jest.Mock;
    };
    loadDraft.mockReturnValue({ ...DEFAULT_DATA, fullName: "" });
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "" }, orgId: null },
    });

    await renderWizard();

    await waitFor(() => {
      expect(capturedShellData?.fullName).toBe("");
    });
  });
});
