import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { gateCookieName } from "@/lib/onboarding-gate";
import type { SetupProvisioning } from "../hooks/use-setup-provisioning";

const mockMutateAsync = jest.fn();
const mockSignIn = jest.fn();
const mockRefreshSessionClaims = jest.fn();
const mockClearAll = jest.fn();
const mockSetCompletionMarker = jest.fn();
const mockHasCompletionMarker = jest.fn();
const mockClearCompletionMarker = jest.fn();
const mockClearBackendTokenCache = jest.fn();
const mockLocationReplace = jest.fn();
const mockToastError = jest.fn();
const mockRecheck = jest.fn();

let mockProvisioning: SetupProvisioning = {
  isReady: false,
  background: "unknown",
  issue: null,
  isRechecking: false,
  hasTimedOut: false,
  recipientOutcomes: null,
  recheck: mockRecheck,
};

let capturedProgressProps: Record<string, unknown> = {};

jest.mock("./generation-progress-stage", () => ({
  GenerationProgressStage: jest.fn((props: Record<string, unknown>) => {
    capturedProgressProps = props;
    return null;
  }),
}));

jest.mock("./welcome-celebration", () => ({
  WelcomeCelebration: jest.fn(() => null),
}));

jest.mock("../hooks/use-setup-provisioning", () => ({
  useSetupProvisioning: jest.fn(() => mockProvisioning),
}));

jest.mock("@/lib/api/hooks/org", () => ({
  useCompleteOrgSetupMutation: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  signInWithMagicToken: jest.fn((...args: unknown[]) => mockSignIn(...args)),
  useSessionClaimsRefresh: jest.fn(() => mockRefreshSessionClaims),
}));

jest.mock("@/features/org-setup/lib/draft", () => ({
  clearAll: jest.fn((...args: unknown[]) => mockClearAll(...args)),
  setCompletionMarker: jest.fn((...args: unknown[]) => mockSetCompletionMarker(...args)),
  hasCompletionMarker: jest.fn((...args: unknown[]) => mockHasCompletionMarker(...args)),
  clearCompletionMarker: jest.fn((...args: unknown[]) =>
    mockClearCompletionMarker(...args),
  ),
}));

jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: jest.fn((...args: unknown[]) =>
    mockClearBackendTokenCache(...args),
  ),
  setAutoSignOutSuppressed: jest.fn(),
  isApiError: jest.fn().mockReturnValue(false),
}));

jest.mock("../lib/setup-payload", () => ({
  buildOrgSetupPayload: jest.fn(() => ({
    industry: "IT Services",
    companySize: "1-10",
    enabledModules: ["chat", "kb"],
  })),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: "user-1" }, orgId: "org-prev" },
  })),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn((...args: unknown[]) => mockToastError(...args)),
    success: jest.fn(),
  },
}));

const TEST_DATA = {
  goals: [],
  industry: "IT Services",
  companyName: "Test Corp",
  teamSize: "1-10",
  phone: "",
  installedApps: [],
  modules: [],
  invitees: [],
};

const SETUP_RESPONSE = {
  success: true as const,
  orgId: "org-new",
  autoLoginToken: "magic-token-abc",
};

const FAKE_SESSION = {
  user: { id: "user-1" },
  orgId: "org-new",
  expires: "2099-01-01",
};

function resetMocks() {
  mockMutateAsync.mockReset();
  mockSignIn.mockReset();
  mockRefreshSessionClaims.mockReset();
  mockClearAll.mockReset();
  mockSetCompletionMarker.mockReset();
  mockHasCompletionMarker.mockReset().mockReturnValue(false);
  mockClearCompletionMarker.mockReset();
  mockClearBackendTokenCache.mockReset();
  mockLocationReplace.mockReset();
  mockToastError.mockReset();
  mockRecheck.mockReset();
  capturedProgressProps = {};
  mockProvisioning = {
    isReady: false,
    background: "unknown",
    issue: null,
    isRechecking: false,
    hasTimedOut: false,
    recipientOutcomes: null,
    recheck: mockRecheck,
  };
}

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { replace: mockLocationReplace },
  });
});

beforeEach(resetMocks);

import { StepGeneration } from "./step-generation";

async function renderWithCreatedOrg(
  responseOverrides: Partial<typeof SETUP_RESPONSE> = {},
) {
  mockMutateAsync.mockResolvedValue({ ...SETUP_RESPONSE, ...responseOverrides });
  render(<StepGeneration data={TEST_DATA} />);
  await waitFor(() => {
    expect(capturedProgressProps.onOpenOrganization).toBeDefined();
  });
}

async function invokeCaptured(prop: "onOpenOrganization" | "onGoToInvitations") {
  const handler = capturedProgressProps[prop];
  if (typeof handler !== "function")
    throw new Error(`${prop} was not passed to GenerationProgressStage`);
  await act(async () => {
    handler();
    await Promise.resolve();
  });
}

describe("StepGeneration — manual continue paths honour the discriminated sign-in outcome", () => {
  it.each(["onOpenOrganization", "onGoToInvitations"] as const)(
    "%s: an indeterminate sign-in outcome surfaces an error and does not navigate",
    async (prop) => {
      await renderWithCreatedOrg();
      mockSignIn.mockResolvedValue({ status: "indeterminate" });

      await invokeCaptured(prop);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });
      expect(mockLocationReplace).not.toHaveBeenCalled();
      expect(mockClearAll).not.toHaveBeenCalled();
      expect(mockSetCompletionMarker).not.toHaveBeenCalled();
    },
  );

  it.each(["onOpenOrganization", "onGoToInvitations"] as const)(
    "%s: a failed sign-in outcome surfaces an error and does not navigate",
    async (prop) => {
      await renderWithCreatedOrg();
      mockSignIn.mockResolvedValue({ status: "failed" });

      await invokeCaptured(prop);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });
      expect(mockLocationReplace).not.toHaveBeenCalled();
    },
  );

  it.each(["onOpenOrganization", "onGoToInvitations"] as const)(
    "%s: autoLoginToken present and signIn ok: navigates without a refresh call",
    async (prop) => {
      await renderWithCreatedOrg();
      mockSignIn.mockResolvedValue({ status: "signed-in" });

      await invokeCaptured(prop);

      await waitFor(() => {
        expect(mockLocationReplace).toHaveBeenCalledTimes(1);
      });
      expect(mockRefreshSessionClaims).not.toHaveBeenCalled();
      expect(mockToastError).not.toHaveBeenCalled();
      expect(mockSetCompletionMarker).toHaveBeenCalledWith("user-1", "org-new");
    },
  );

  it("onOpenOrganization: signIn ok → marker written, no refresh, /dashboard", async () => {
    await renderWithCreatedOrg();
    mockSignIn.mockResolvedValue({ status: "signed-in" });

    await invokeCaptured("onOpenOrganization");

    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
    });
    expect(mockRefreshSessionClaims).not.toHaveBeenCalled();
    expect(mockSetCompletionMarker).toHaveBeenCalledWith("user-1", "org-new");
  });

  it("onGoToInvitations: signIn ok → no refresh, invitations view", async () => {
    await renderWithCreatedOrg();
    mockSignIn.mockResolvedValue({ status: "signed-in" });

    await invokeCaptured("onGoToInvitations");

    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith(
        "/settings/users?view=invitations",
      );
    });
    expect(mockRefreshSessionClaims).not.toHaveBeenCalled();
  });

  it("a withheld auto-login token skips the magic sign-in and still refreshes the session", async () => {
    await renderWithCreatedOrg({ autoLoginToken: undefined });
    mockRefreshSessionClaims.mockResolvedValue(FAKE_SESSION);

    await invokeCaptured("onOpenOrganization");

    await waitFor(() => {
      expect(mockRefreshSessionClaims).toHaveBeenCalledWith({ orgId: "org-new" });
    });
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(document.cookie).toContain(
      gateCookieName("org-setup-done", "org-new"),
    );
  });

  it("autoLoginToken present: signIn establishes the new org, no refresh needed", async () => {
    await renderWithCreatedOrg();
    mockSignIn.mockResolvedValue({ status: "signed-in" });

    await invokeCaptured("onOpenOrganization");

    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
    });
    expect(mockRefreshSessionClaims).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("no-token path: re-entering while a refresh is still in flight starts no second run", async () => {
    await renderWithCreatedOrg({ autoLoginToken: undefined });

    let settleFirst: ((session: unknown) => void) | undefined;
    mockRefreshSessionClaims.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          settleFirst = resolve;
        }),
    );

    await invokeCaptured("onOpenOrganization");
    expect(mockLocationReplace).not.toHaveBeenCalled();

    await invokeCaptured("onGoToInvitations");
    expect(mockRefreshSessionClaims).toHaveBeenCalledTimes(1);

    await act(async () => {
      settleFirst?.(FAKE_SESSION);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
    });
    expect(mockLocationReplace).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("a second manual continue while one is in flight does not run the flow twice", async () => {
    await renderWithCreatedOrg();
    mockSignIn.mockResolvedValue({ status: "signed-in" });

    await invokeCaptured("onOpenOrganization");
    await invokeCaptured("onGoToInvitations");

    expect(mockRefreshSessionClaims).not.toHaveBeenCalled();
    expect(mockLocationReplace).toHaveBeenCalledTimes(1);
    expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("recheck only re-reads status — it never resubmits the setup mutation", async () => {
    await renderWithCreatedOrg();
    mockMutateAsync.mockClear();

    const recheck = capturedProgressProps.onRecheckProvisioning;
    if (typeof recheck !== "function") throw new Error("recheck was not passed");
    await act(async () => {
      recheck();
      await Promise.resolve();
    });

    expect(mockRecheck).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockLocationReplace).not.toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
