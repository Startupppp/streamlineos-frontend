import { renderHook } from "@testing-library/react";

const mockUseSession = jest.fn().mockReturnValue({
  data: {
    orgId: "org-1",
    user: { id: "u-1", name: "Test User", email: "test@example.com", role: "ADMIN" },
  },
  status: "authenticated",
});

const mockUseOnboardingSessionQuery = jest.fn();
const mockUsePatchOnboardingSessionMutation = jest.fn().mockReturnValue({
  mutateAsync: jest.fn().mockResolvedValue({ currentStep: "bank", completedSteps: [], data: {} }),
});
const mockUseBankDetailsQuery = jest.fn();
const mockUsePersonalDetailsQuery = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/features/employee-onboarding/lib/preview-snapshot", () => ({
  toPreviewSnapshot: jest.fn().mockReturnValue({}),
}));

jest.mock("@/features/employee-onboarding/lib/onboarding-requirements-schema", () => ({
  countryNameToCode: jest.fn().mockReturnValue("IN"),
}));

jest.mock("@/features/employee-onboarding/lib/draft-storage", () => ({
  loadOnboardingDraft: jest.fn().mockReturnValue(null),
  saveOnboardingDraft: jest.fn(),
  clearOnboardingDraft: jest.fn(),
}));

jest.mock("@/hooks/api/onboarding-flow", () => ({
  useOnboardingSessionQuery: (...args: unknown[]) => mockUseOnboardingSessionQuery(...args),
  usePatchOnboardingSessionMutation: (...args: unknown[]) =>
    mockUsePatchOnboardingSessionMutation(...args),
}));

jest.mock("@/lib/api/hooks/onboarding", () => ({
  useBankDetailsQuery: (...args: unknown[]) => mockUseBankDetailsQuery(...args),
  usePersonalDetailsQuery: (...args: unknown[]) => mockUsePersonalDetailsQuery(...args),
  usePersonalInfoMutation: () => ({ mutateAsync: jest.fn().mockResolvedValue(undefined) }),
  useBankDetailsMutation: () => ({ mutateAsync: jest.fn().mockResolvedValue(undefined) }),
}));

function okQuery() {
  return { data: undefined, error: null, isLoading: false, refetch: jest.fn() };
}

function failedQuery(error: Error) {
  return { data: undefined, error, isLoading: false, refetch: jest.fn() };
}

function loadWizard() {
  const { useOnboardingWizard } = jest.requireActual<
    typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
  >("@/features/employee-onboarding/hooks/use-onboarding-wizard");
  return renderHook(() => useOnboardingWizard());
}

describe("useOnboardingWizard — a prefill read failure must never trap the user in the wizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePatchOnboardingSessionMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ currentStep: "bank", completedSteps: [], data: {} }),
    });
    mockUseOnboardingSessionQuery.mockReturnValue({
      data: { id: 1, status: "in_progress" as const, currentStep: "bank", completedSteps: ["personal"], data: {} },
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseBankDetailsQuery.mockReturnValue(okQuery());
    mockUsePersonalDetailsQuery.mockReturnValue(okQuery());
  });

  it("a failing bank-details read is reported as prefillError, not as the fatal loadError", () => {
    const boom = new Error("500 Internal Server Error");
    mockUseBankDetailsQuery.mockReturnValue(failedQuery(boom));

    const { result } = loadWizard();

    expect(result.current.loadError).toBeFalsy();
    expect(result.current.prefillError).toBe(boom);
  });

  it("a failing personal-details read is also non-fatal", () => {
    const boom = new Error("500 Internal Server Error");
    mockUsePersonalDetailsQuery.mockReturnValue(failedQuery(boom));

    const { result } = loadWizard();

    expect(result.current.loadError).toBeFalsy();
    expect(result.current.prefillError).toBe(boom);
  });

  it("a failing session read stays fatal, because the wizard has no state to stand on", () => {
    const boom = new Error("500 Internal Server Error");
    mockUseOnboardingSessionQuery.mockReturnValue({
      data: undefined,
      error: boom,
      isLoading: false,
      refetch: jest.fn(),
    });

    const { result } = loadWizard();

    expect(result.current.loadError).toBe(boom);
  });
});
