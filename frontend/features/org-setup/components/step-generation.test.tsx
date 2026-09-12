import React from "react";
import { render, waitFor } from "@testing-library/react";
import type { SetupProvisioning } from "../hooks/use-setup-provisioning";

const mockMutateAsync = jest.fn();
const mockSignIn = jest.fn();
const mockCompleteOnboardingGate = jest.fn();
const mockClearAll = jest.fn();
const mockSetCompletionMarker = jest.fn();
const mockHasCompletionMarker = jest.fn();
const mockClearCompletionMarker = jest.fn();
const mockClearBackendTokenCache = jest.fn();
const mockLocationReplace = jest.fn();

let mockProvisioning: SetupProvisioning = {
  isReady: false,
  background: "unknown",
  issue: null,
  isRechecking: false,
  hasTimedOut: false,
  recheck: jest.fn(),
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
  useSessionClaimsRefresh: jest.fn(() => jest.fn()),
}));

jest.mock("@/lib/onboarding-gate", () => ({
  completeOnboardingGate: jest.fn((...args: unknown[]) => mockCompleteOnboardingGate(...args)),
}));

jest.mock("@/features/org-setup/lib/draft", () => ({
  clearAll: jest.fn((...args: unknown[]) => mockClearAll(...args)),
  setCompletionMarker: jest.fn((...args: unknown[]) => mockSetCompletionMarker(...args)),
  hasCompletionMarker: jest.fn((...args: unknown[]) => mockHasCompletionMarker(...args)),
  clearCompletionMarker: jest.fn((...args: unknown[]) => mockClearCompletionMarker(...args)),
}));

jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: jest.fn((...args: unknown[]) => mockClearBackendTokenCache(...args)),
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

const SIGN_IN_SUCCESS = { status: "signed-in" as const };
const SIGN_IN_FAILED = { status: "failed" as const };

const FAKE_SESSION = { user: { id: "user-1" }, expires: "2099-01-01" };

function resetMocks() {
  mockMutateAsync.mockReset();
  mockSignIn.mockReset();
  mockCompleteOnboardingGate.mockReset();
  mockClearAll.mockReset();
  mockSetCompletionMarker.mockReset();
  mockHasCompletionMarker.mockReset().mockReturnValue(false);
  mockClearCompletionMarker.mockReset();
  mockClearBackendTokenCache.mockReset();
  mockLocationReplace.mockReset();
  capturedProgressProps = {};
  mockProvisioning = {
    isReady: false,
    background: "unknown",
    issue: null,
    isRechecking: false,
    hasTimedOut: false,
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

describe("StepGeneration — signInWithMagicToken returns false", () => {
  it("ANTI-VACUITY: when signIn succeeds, clearAll IS called", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);
    mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
    mockCompleteOnboardingGate.mockResolvedValue(FAKE_SESSION);

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

describe("StepGeneration — completeOnboardingGate returns null", () => {
  it("error surfaced, draft NOT cleared, marker NOT written, no navigation", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);
    mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
    mockCompleteOnboardingGate.mockResolvedValue(null);

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

describe("StepGeneration — both auth steps succeed", () => {
  it("clears draft, writes scoped marker keyed to user+org, shows welcome", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);
    mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
    mockCompleteOnboardingGate.mockResolvedValue(FAKE_SESSION);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(capturedProgressProps.showWelcome).toBe(true);
    });

    expect(mockClearAll).toHaveBeenCalledWith("user-1");
    expect(mockSetCompletionMarker).toHaveBeenCalledWith("user-1", "org-new");
    expect(capturedProgressProps.setupError).toBeNull();
  });
});

describe("StepGeneration — isReady true + background pending → wizard completes", () => {
  it("auto-completes via isReady, does not hang waiting for background", async () => {
    mockProvisioning = { ...mockProvisioning, isReady: true, background: "pending" };
    mockMutateAsync.mockResolvedValue({ ...SETUP_RESPONSE, autoLoginToken: null });
    mockCompleteOnboardingGate.mockResolvedValue(FAKE_SESSION);

    render(<StepGeneration data={TEST_DATA} />);

    await waitFor(() => {
      expect(mockCompleteOnboardingGate).toHaveBeenCalled();
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
      issue,
      isRechecking: false,
      hasTimedOut: false,
      recheck: jest.fn(),
    };
    mockMutateAsync.mockResolvedValue({ ...SETUP_RESPONSE, autoLoginToken: null });
    mockCompleteOnboardingGate.mockResolvedValue(FAKE_SESSION);

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

  it("does NOT redirect when marker is absent (different user+org)", () => {
    mockHasCompletionMarker.mockReturnValue(false);
    mockMutateAsync.mockResolvedValue(SETUP_RESPONSE);

    render(<StepGeneration data={TEST_DATA} />);

    expect(mockLocationReplace).not.toHaveBeenCalled();
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
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });
});
