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
  mutateAsync: jest.fn().mockResolvedValue({ currentStep: "personal", completedSteps: [], data: {} }),
});

const mockUseBankDetailsQuery = jest.fn().mockReturnValue({
  data: undefined,
  error: null,
  isLoading: false,
  refetch: jest.fn(),
});

const mockUsePersonalDetailsQuery = jest.fn().mockReturnValue({
  data: undefined,
  error: null,
  isLoading: false,
  refetch: jest.fn(),
});

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

jest.mock("@/hooks/api/onboarding-flow", () => ({
  useOnboardingSessionQuery: (...args: unknown[]) => mockUseOnboardingSessionQuery(...args),
  usePatchOnboardingSessionMutation: (...args: unknown[]) =>
    mockUsePatchOnboardingSessionMutation(...args),
}));

jest.mock("@/lib/api/hooks/onboarding", () => ({
  useBankDetailsQuery: (...args: unknown[]) => mockUseBankDetailsQuery(...args),
  usePersonalDetailsQuery: (...args: unknown[]) => mockUsePersonalDetailsQuery(...args),
}));

function makeSession(
  currentStep: string,
  completedSteps: string[],
) {
  return {
    data: { id: 1, status: "in_progress" as const, currentStep, completedSteps, data: {} },
    error: null,
    isLoading: false,
    refetch: jest.fn(),
  };
}

describe("bank-details gate in useOnboardingWizard (R4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePatchOnboardingSessionMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ currentStep: "personal", completedSteps: [], data: {} }),
    });
    mockUseBankDetailsQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUsePersonalDetailsQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  it("brand-new employee on PERSONAL step does NOT fetch bank details", () => {
    mockUseOnboardingSessionQuery.mockReturnValue(
      makeSession("personal", []),
    );

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    renderHook(() => useOnboardingWizard());

    expect(mockUseBankDetailsQuery).toHaveBeenCalledWith({ enabled: false });
    expect(mockUseBankDetailsQuery).not.toHaveBeenCalledWith({ enabled: true });
  });

  it("returning employee at BANK step DOES fetch bank details", () => {
    mockUseOnboardingSessionQuery.mockReturnValue(
      makeSession("bank", ["personal"]),
    );

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    renderHook(() => useOnboardingWizard());

    expect(mockUseBankDetailsQuery).toHaveBeenCalledWith({ enabled: true });
  });

  it("returning employee at REVIEW step with bank completed DOES fetch bank details", () => {
    mockUseOnboardingSessionQuery.mockReturnValue(
      makeSession("finish", ["personal", "bank"]),
    );

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    renderHook(() => useOnboardingWizard());

    expect(mockUseBankDetailsQuery).toHaveBeenCalledWith({ enabled: true });
  });

  it("returning employee with bank completed even if showing PERSONAL step DOES fetch bank details", () => {
    mockUseOnboardingSessionQuery.mockReturnValue(
      makeSession("personal", ["bank"]),
    );

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    renderHook(() => useOnboardingWizard());

    expect(mockUseBankDetailsQuery).toHaveBeenCalledWith({ enabled: true });
  });

  it("session still loading does NOT fetch bank details", () => {
    mockUseOnboardingSessionQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      refetch: jest.fn(),
    });

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    renderHook(() => useOnboardingWizard());

    expect(mockUseBankDetailsQuery).toHaveBeenCalledWith({ enabled: false });
  });
});
