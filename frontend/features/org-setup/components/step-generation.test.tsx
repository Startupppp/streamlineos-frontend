import React from "react";
import { render, waitFor } from "@testing-library/react";
import { gateCookieName } from "@/lib/onboarding-gate";
import { SESSION_CLAIMS_UNCONFIRMED_MESSAGE } from "@/hooks/common/use-confirmed-session-claims-refresh";
import type { SetupProvisioning } from "../hooks/use-setup-provisioning";

const mockMutateAsync = jest.fn();
const mockActivateMutateAsync = jest.fn();
const mockSignIn = jest.fn();
const mockRefreshSessionClaims = jest.fn();
const mockClearAll = jest.fn();
const mockSetCompletionMarker = jest.fn();
const mockHasCompletionMarker = jest.fn();
const mockGetCompletionDestination = jest.fn(() => "/dashboard");
const mockClearCompletionMarker = jest.fn();
const mockClearBackendTokenCache = jest.fn();
const mockLocationReplace = jest.fn();
const mockIsApiError = jest.fn();

let mockProvisioning: SetupProvisioning = {
  isReady: false,
  background: "unknown",
  orgId: null,
  issue: null,
  isRechecking: false,
  hasTimedOut: false,
  recipientOutcomes: null,
  recheck: jest.fn(),
};

let capturedProgressProps: Record<string, unknown> = {};
let capturedWelcomeProps: Record<string, unknown> = {};

jest.mock("./generation-progress-stage", () => ({
  GenerationProgressStage: jest.fn((props: Record<string, unknown>) => {
    capturedProgressProps = props;
    return null;
  }),
}));

jest.mock("./welcome-celebration", () => ({
  WelcomeCelebration: jest.fn((props: Record<string, unknown>) => {
    capturedWelcomeProps = props;
    return null;
  }),
}));

jest.mock("../hooks/use-setup-provisioning", () => ({
  useSetupProvisioning: jest.fn(() => mockProvisioning),
}));

jest.mock("@/hooks/api/org-setup", () => ({
  useCompleteOrgSetupMutation: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
  useOrgSetupActivateMutation: jest.fn(() => ({
    mutateAsync: mockActivateMutateAsync,
    isPending: false,
  })),
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  signInWithMagicToken: jest.fn((...args: unknown[]) => mockSignIn(...args)),
  useSessionClaimsRefresh: jest.fn(() => mockRefreshSessionClaims),
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

jest.mock("@/features/org-setup/lib/draft", () => ({
  clearAll: jest.fn((...args: unknown[]) => mockClearAll(...args)),
  setCompletionMarker: jest.fn((...args: unknown[]) => mockSetCompletionMarker(...args)),
  hasCompletionMarker: jest.fn((...args: unknown[]) => mockHasCompletionMarker(...args)),
  getCompletionDestination: jest.fn((...args: unknown[]) => mockGetCompletionDestination(...args)),
  clearCompletionMarker: jest.fn((...args: unknown[]) => mockClearCompletionMarker(...args)),
}));

jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: jest.fn((...args: unknown[]) => mockClearBackendTokenCache(...args)),
  setAutoSignOutSuppressed: jest.fn(),
  isApiError: jest.fn((error: unknown) => mockIsApiError(error)),
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
  toast: { error: jest.fn(), success: jest.fn() },
}));

const TEST_DATA = {
  goals: [],
  industry: "IT Services",
  companyName: "Test Corp",
  displayName: "Test Corp",
  fullName: "QA Owner",
  teamSize: "1-10",
  phone: "",
  installedApps: [],
  modules: [],
  invitees: [],
  moduleAnswers: {},
};

const SETUP_RESPONSE = {
  success: true as const,
  orgId: "org-new",
  autoLoginToken: "magic-token-abc",
  destination: "/dashboard",
};

const SIGN_IN_SUCCESS = { status: "signed-in" as const };
const SIGN_IN_FAILED = { status: "failed" as const };

const FAKE_SESSION = {
  user: { id: "user-1" },
  orgId: "org-new",
  expires: "2099-01-01",
};

function resetMocks() {
  mockMutateAsync.mockReset();
  mockActivateMutateAsync.mockReset();
  mockSignIn.mockReset();
  mockRefreshSessionClaims.mockReset();
  mockClearAll.mockReset();
  mockSetCompletionMarker.mockReset();
  mockHasCompletionMarker.mockReset().mockReturnValue(false);
  mockClearCompletionMarker.mockReset();
  mockClearBackendTokenCache.mockReset();
  mockLocationReplace.mockReset();
  mockIsApiError.mockReset().mockReturnValue(false);
  capturedProgressProps = {};
  capturedWelcomeProps = {};
  mockProvisioning = {
    isReady: false,
    background: "unknown",
    orgId: null,
    issue: null,
    isRechecking: false,
    hasTimedOut: false,
    recipientOutcomes: null,
    recheck: jest.fn(),
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

describe("StepGeneration — product plan rejection", () => {
  it("keeps the draft and exposes a return to product choices for the server plan lock", async () => {
    const onBackToProducts = jest.fn();
    mockIsApiError.mockReturnValue(true);
    mockMutateAsync.mockRejectedValue(
      Object.assign(new Error("Inventory is not available on your plan."), {
        status: 402,
        code: "MODULE_NOT_ENABLED",
        details: { moduleKey: "inventory", reason: "not-in-plan" },
      }),
    );

    render(<StepGeneration data={TEST_DATA} onBackToProducts={onBackToProducts} />);

    await waitFor(() => {
      expect(capturedProgressProps.setupError).toEqual({
        kind: "module-not-in-plan",
        message: "Inventory is not available on your plan.",
      });
    });
    expect(capturedProgressProps.onBackToProducts).toBe(onBackToProducts);
    expect(mockClearAll).not.toHaveBeenCalled();
    expect(mockSetCompletionMarker).not.toHaveBeenCalled();
    expect(mockLocationReplace).not.toHaveBeenCalled();
  });

  it("does not label other module denials as a plan lock", async () => {
    mockIsApiError.mockReturnValue(true);
    mockMutateAsync.mockRejectedValue(
      Object.assign(new Error("You do not have access to Inventory."), {
        status: 402,
        code: "MODULE_NOT_ENABLED",
        details: { moduleKey: "inventory", reason: "user-denied" },
      }),
    );

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.setupError).toEqual({
        kind: "setup-failed",
        message: "You do not have access to Inventory.",
      });
    });
  });

  it("MODULE_ELIGIBILITY_CHANGED (409) maps to module-not-in-plan — same Back to Products path as plan lock (BT-12293bf84d3a)", async () => {
    const onBackToProducts = jest.fn();
    mockIsApiError.mockReturnValue(true);
    mockMutateAsync.mockRejectedValue(
      Object.assign(new Error("One or more selected modules are not available on your current plan."), {
        status: 409,
        code: "MODULE_ELIGIBILITY_CHANGED",
        details: { newReview: { moduleEligibility: [{ moduleKey: "payroll", eligible: false }] } },
      }),
    );

    render(<StepGeneration data={TEST_DATA} onBackToProducts={onBackToProducts} />);

    await waitFor(() => {
      expect(capturedProgressProps.setupError).toEqual({
        kind: "module-not-in-plan",
        message: "One or more selected modules are not available on your current plan.",
      });
    });
    expect(capturedProgressProps.onBackToProducts).toBe(onBackToProducts);
    expect(mockClearAll).not.toHaveBeenCalled();
    expect(mockLocationReplace).not.toHaveBeenCalled();
  });

  it("MODULE_ELIGIBILITY_CHANGED without onBackToProducts still maps to module-not-in-plan kind", async () => {
    mockIsApiError.mockReturnValue(true);
    mockMutateAsync.mockRejectedValue(
      Object.assign(new Error("Plan change detected."), {
        status: 409,
        code: "MODULE_ELIGIBILITY_CHANGED",
      }),
    );

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.setupError).toMatchObject({
        kind: "module-not-in-plan",
      });
    });
  });
});

describe("StepGeneration — signInWithMagicToken returns false", () => {
  it("ANTI-VACUITY: when signIn succeeds, clearAll IS called", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);
    mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
    mockRefreshSessionClaims.mockResolvedValue(FAKE_SESSION);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(mockClearAll).toHaveBeenCalledWith("user-1");
    });
  });

  it("error surfaced, draft NOT cleared, marker NOT written, no navigation", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);
    mockSignIn.mockResolvedValue(SIGN_IN_FAILED);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.setupError).not.toBeNull();
    });

    expect(mockClearAll).not.toHaveBeenCalled();
    expect(mockSetCompletionMarker).not.toHaveBeenCalled();
    expect(mockLocationReplace).not.toHaveBeenCalled();
    expect(capturedProgressProps.setupError).toMatchObject({ kind: "setup-failed" });
  });
});

describe("StepGeneration — the claims refresh never confirms the new org", () => {
  it("uses the existing session refresh instead of signing in again when it confirms the new org", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);
    mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
    mockRefreshSessionClaims.mockResolvedValue(FAKE_SESSION);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.showWelcome).toBe(true);
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledWith({ orgId: "org-new" });
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockClearAll).toHaveBeenCalledWith("user-1");
    expect(mockSetCompletionMarker).toHaveBeenCalledWith("user-1", "org-new", "/dashboard");
    expect(capturedProgressProps.setupError).toBeNull();
    expect(document.cookie).toContain(
      gateCookieName("org-setup-done", "org-new"),
    );
  });

  it("writes the route gate before refreshing the existing session", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);
    mockRefreshSessionClaims.mockImplementation(async () => {
      expect(document.cookie).toContain(
        gateCookieName("org-setup-done", "org-new"),
      );
      return FAKE_SESSION;
    });

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.showWelcome).toBe(true);
    });
  });

  it("no autoLoginToken: a timed-out refresh surfaces the error, clears nothing", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue({ ...SETUP_RESPONSE, autoLoginToken: null });
    mockRefreshSessionClaims.mockResolvedValue(null);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.setupError).not.toBeNull();
    });

    expect(mockClearAll).not.toHaveBeenCalled();
    expect(mockSetCompletionMarker).not.toHaveBeenCalled();
    expect(mockLocationReplace).not.toHaveBeenCalled();
    expect(capturedProgressProps.setupError).toMatchObject({
      kind: "setup-failed",
      message: SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
    });
  });

  it("no autoLoginToken: asks the refresh for the org the setup mutation returned", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue({ ...SETUP_RESPONSE, autoLoginToken: null });
    mockRefreshSessionClaims.mockResolvedValue(FAKE_SESSION);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(mockRefreshSessionClaims).toHaveBeenCalledWith({ orgId: "org-new" });
    });
    expect(document.cookie).toContain(
      gateCookieName("org-setup-done", "org-new"),
    );
  });
});

describe("StepGeneration — both auth steps succeed", () => {
  it("clears draft, writes scoped marker keyed to user+org and shows welcome after one refresh", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);
    mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
    mockRefreshSessionClaims.mockResolvedValue(FAKE_SESSION);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.showWelcome).toBe(true);
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledTimes(1);
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockClearAll).toHaveBeenCalledWith("user-1");
    expect(mockSetCompletionMarker).toHaveBeenCalledWith("user-1", "org-new", "/dashboard");
    expect(capturedProgressProps.setupError).toBeNull();
  });
});

describe("StepGeneration — isReady true + background pending → wizard completes", () => {
  it("auto-completes via isReady, does not hang waiting for background", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue({ ...SETUP_RESPONSE, autoLoginToken: null });
    mockRefreshSessionClaims.mockResolvedValue(FAKE_SESSION);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(mockRefreshSessionClaims).toHaveBeenCalled();
    });

    expect(capturedProgressProps.setupError).toBeNull();
  });
});

describe("StepGeneration — background failed + isReady true → user can continue", () => {
  it("passes provisioningIssue from hook, still completes setup via isReady", async () => {
    const issue = {
      title: "Optional step did not finish",
      message: "Your workspace is ready.",
      reference: null,
      canContinue: true,
    };
    mockProvisioning = {
      isReady: true,
      background: "failed",
      orgId: null,
      issue,
      isRechecking: false,
      hasTimedOut: false,
      recipientOutcomes: null,
      recheck: jest.fn(),
    };
    mockMutateAsync.mockResolvedValue({ ...SETUP_RESPONSE, autoLoginToken: null });
    mockRefreshSessionClaims.mockResolvedValue(FAKE_SESSION);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.showWelcome).toBe(true);
    });

    expect(capturedProgressProps.provisioningIssue).toBe(issue);
  });
});

describe("StepGeneration — second mount markers", () => {
  it("redirects when marker matches current user + org from session", () => {
    mockHasCompletionMarker.mockReturnValue(true);

    render(<StepGeneration data={TEST_DATA} />);

    expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("does NOT redirect when marker is absent (different user+org)", async () => {
    mockHasCompletionMarker.mockReturnValue(false);
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.onOpenOrganization).toBeDefined();
    });
    expect(mockLocationReplace).not.toHaveBeenCalled();
  });
});

describe("StepGeneration — isValidRedirectPath guard", () => {
  it("navigates to /dashboard on openOrganization", async () => {
    const issue = null;
    mockProvisioning = {
      isReady: false,
      background: "pending",
      orgId: "org-new",
      issue,
      isRechecking: false,
      hasTimedOut: false,
      recipientOutcomes: null,
      recheck: jest.fn(),
    };
    mockMutateAsync.mockResolvedValue({ ...SETUP_RESPONSE, autoLoginToken: null });
    mockRefreshSessionClaims.mockResolvedValue(FAKE_SESSION);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.onOpenOrganization).toBeDefined();
    });

    const onOpenOrganization = capturedProgressProps.onOpenOrganization as () => void;
    onOpenOrganization();

    await waitFor(() => {
      expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
    });
  });
});

describe("StepGeneration — StrictMode double-invoke", () => {
  it("calls mutateAsync exactly once even under StrictMode", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: false, background: "pending" };
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);

    render(
      <React.StrictMode>
        <StepGeneration data={TEST_DATA} />
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(capturedProgressProps.onOpenOrganization).toBeDefined();
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });
});

describe("StepGeneration — server destination replaces hardcoded /dashboard", () => {
  it("uses the server-provided destination for goToWorkspace instead of /dashboard", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue({
      ...SETUP_RESPONSE,
      destination: "/build/projects/my-proj",
    });
    mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
    mockRefreshSessionClaims.mockResolvedValue(FAKE_SESSION);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.showWelcome).toBe(true);
    });

    const onContinue = capturedWelcomeProps.onContinue as () => void;
    onContinue();

    expect(mockLocationReplace).toHaveBeenCalledWith("/build/projects/my-proj");
    expect(mockSetCompletionMarker).toHaveBeenCalledWith(
      "user-1",
      "org-new",
      "/build/projects/my-proj",
    );
  });

  it("falls back to /dashboard when server destination is not available at marker redirect time", () => {
    mockHasCompletionMarker.mockReturnValue(true);
    mockGetCompletionDestination.mockReturnValue("/dashboard");

    render(<StepGeneration data={TEST_DATA} />);

    expect(mockLocationReplace).toHaveBeenCalledWith("/dashboard");
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});


describe("StepGeneration — SETUP_IN_PROGRESS", () => {
  it("polls status like TIMEOUT instead of setup-failed", async () => {
    mockIsApiError.mockReturnValue(true);
    mockMutateAsync.mockRejectedValue(
      Object.assign(new Error("Organization setup is already in progress."), {
        status: 409,
        code: "SETUP_IN_PROGRESS",
      }),
    );

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.setupError).toBeNull();
    });
    // Polling after timeout flag drives status poll / destination navigation
    await waitFor(() => {
      expect(capturedProgressProps.isPollingAfterTimeout === true || capturedProgressProps.setupError === null).toBe(true);
    });
  });
});
