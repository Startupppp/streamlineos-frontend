import { act, renderHook } from "@testing-library/react";

const mockPatchSession = jest.fn();

const mockUseSession = jest.fn().mockReturnValue({
  data: {
    orgId: "org-1",
    user: { id: "u-1", name: "Test User", email: "test@example.com", role: "ADMIN" },
  },
  status: "authenticated",
});

const mockUseOnboardingSessionQuery = jest.fn();
const mockUsePatchOnboardingSessionMutation = jest.fn();
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
  toPreviewSnapshot: jest.fn().mockReturnValue({ bankCodeLabel: "IFSC" }),
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

jest.mock("@/features/employee-onboarding/lib/draft-storage", () => ({
  loadOnboardingDraft: jest.fn().mockReturnValue(null),
  saveOnboardingDraft: jest.fn(),
  clearOnboardingDraft: jest.fn(),
}));

function makeSession(currentStep: string, completedSteps: string[]) {
  return {
    data: { id: 1, status: "in_progress" as const, currentStep, completedSteps, data: {} },
    error: null,
    isLoading: false,
    refetch: jest.fn(),
  };
}

const PERSONAL_DRAFT = {
  phone: "+919876543210",
  gender: "FEMALE" as const,
  dateOfBirth: "1990-04-12",
  addressLine1: "123 Main St",
  addressCity: "Mumbai",
  addressState: "Maharashtra",
  addressPostalCode: "400001",
  addressCountry: "India",
  emergencyName: "Grace Hopper",
  emergencyRelation: "Parent",
  emergencyPhone: "+919812345678",
};

const BANK_DRAFT = {
  countryCode: "IN",
  accountHolder: "Ada Lovelace",
  bankName: "Acme Bank",
  accountNumber: "123456789012",
  routingCode: "ACME0001234",
  iban: "",
  swift: "",
  statutory: {},
};

describe("useOnboardingWizard — call count guarantees", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPatchSession.mockResolvedValue({ currentStep: "bank", completedSteps: [], data: {} });
    mockUsePatchOnboardingSessionMutation.mockReturnValue({
      mutateAsync: mockPatchSession,
    });
    mockUseOnboardingSessionQuery.mockReturnValue(makeSession("personal", []));
    mockUseBankDetailsQuery.mockReturnValue({
      data: undefined, error: null, isLoading: false, refetch: jest.fn(),
    });
    mockUsePersonalDetailsQuery.mockReturnValue({
      data: undefined, error: null, isLoading: false, refetch: jest.fn(),
    });
  });

  it("completing the personal step performs no server mutation", async () => {
    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    const { result } = renderHook(() => useOnboardingWizard());

    await act(async () => {
      await result.current.handlePersonalComplete(PERSONAL_DRAFT);
    });

    expect(mockPatchSession).not.toHaveBeenCalled();
  });

  it("completing the bank step performs no server mutation", async () => {
    mockUseOnboardingSessionQuery.mockReturnValue(makeSession("bank", ["personal"]));
    mockPatchSession.mockResolvedValue({ currentStep: "finish", completedSteps: ["personal", "bank"], data: {} });

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    const { result } = renderHook(() => useOnboardingWizard());

    await act(async () => {
      await result.current.handleBankComplete(BANK_DRAFT);
    });

    expect(mockPatchSession).not.toHaveBeenCalled();
  });

  it("field draft changes do NOT call patchSession — only localStorage is written", async () => {
    const { saveOnboardingDraft } = jest.requireMock<
      typeof import("@/features/employee-onboarding/lib/draft-storage")
    >("@/features/employee-onboarding/lib/draft-storage");

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    const { result } = renderHook(() => useOnboardingWizard());

    act(() => {
      result.current.handlePersonalDraftChange({ ...PERSONAL_DRAFT, phone: "+911111111111" });
    });
    act(() => {
      result.current.handlePersonalDraftChange({ ...PERSONAL_DRAFT, phone: "+912222222222" });
    });
    act(() => {
      result.current.handleBankDraftChange({ ...BANK_DRAFT, accountHolder: "Edit 1" });
    });

    expect(mockPatchSession).not.toHaveBeenCalled();
    expect(saveOnboardingDraft).toHaveBeenCalled();
  });

  it("moving between already-reachable steps costs no request at all", () => {
    mockUseOnboardingSessionQuery.mockReturnValue(
      makeSession("finish", ["personal", "bank"]),
    );

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    const { result } = renderHook(() => useOnboardingWizard());

    act(() => {
      result.current.handleGoToPersonal();
    });
    expect(result.current.activeTab).toBe("personal");

    act(() => {
      result.current.handleGoToBank();
    });
    expect(result.current.activeTab).toBe("bank");

    expect(mockPatchSession).not.toHaveBeenCalled();
  });

  it("re-selecting the step already on screen is a no-op, not another render cycle", () => {
    mockUseOnboardingSessionQuery.mockReturnValue(
      makeSession("bank", ["personal"]),
    );

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    const { result } = renderHook(() => useOnboardingWizard());

    act(() => {
      result.current.handleGoToBank();
    });

    expect(result.current.activeTab).toBe("bank");
    expect(mockPatchSession).not.toHaveBeenCalled();
  });

  it("clearing persisted data after submission keeps the completed review mounted", async () => {
    mockUseOnboardingSessionQuery.mockReturnValue(
      makeSession("finish", ["personal", "bank"]),
    );

    const { clearOnboardingDraft } = jest.requireMock<
      typeof import("@/features/employee-onboarding/lib/draft-storage")
    >("@/features/employee-onboarding/lib/draft-storage");
    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    const { result } = renderHook(() => useOnboardingWizard());

    await act(async () => {
      await result.current.handlePersonalComplete(PERSONAL_DRAFT);
      await result.current.handleBankComplete(BANK_DRAFT);
    });
    act(() => {
      result.current.clearDraft();
    });

    expect(clearOnboardingDraft).toHaveBeenCalledWith("u-1", "org-1");
    expect(result.current.activeTab).toBe("finish");
    expect(result.current.wizardDraft.personal.phone).toBe(PERSONAL_DRAFT.phone);
    expect(result.current.wizardDraft.bank.accountNumber).toBe(BANK_DRAFT.accountNumber);
  });
});

describe("useOnboardingWizard — one country code feeds both bank and review", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPatchSession.mockResolvedValue({ currentStep: "bank", completedSteps: [], data: {} });
    mockUsePatchOnboardingSessionMutation.mockReturnValue({ mutateAsync: mockPatchSession });
    mockUseOnboardingSessionQuery.mockReturnValue(makeSession("bank", ["personal"]));
    mockUsePersonalDetailsQuery.mockReturnValue({
      data: undefined, error: null, isLoading: false, refetch: jest.fn(),
    });
    mockUseBankDetailsQuery.mockReturnValue({
      data: undefined, error: null, isLoading: false, refetch: jest.fn(),
    });
  });

  it("prefers the saved bank country so the two steps cannot request different requirements", () => {
    const { loadOnboardingDraft } = jest.requireMock<
      typeof import("@/features/employee-onboarding/lib/draft-storage")
    >("@/features/employee-onboarding/lib/draft-storage");
    (loadOnboardingDraft as jest.Mock).mockReturnValue({
      personal: { ...PERSONAL_DRAFT, addressCountry: "India" },
      bank: { ...BANK_DRAFT, countryCode: "US" },
    });

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    const { result } = renderHook(() => useOnboardingWizard());

    expect(result.current.countryCode).toBe("US");
  });

  it("falls back to the address country when no bank country is stored yet", () => {
    const { loadOnboardingDraft } = jest.requireMock<
      typeof import("@/features/employee-onboarding/lib/draft-storage")
    >("@/features/employee-onboarding/lib/draft-storage");
    (loadOnboardingDraft as jest.Mock).mockReturnValue({
      personal: { ...PERSONAL_DRAFT, addressCountry: "India" },
      bank: { ...BANK_DRAFT, countryCode: "" },
    });

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    const { result } = renderHook(() => useOnboardingWizard());

    expect(result.current.countryCode).toBe("IN");
  });
});

describe("useOnboardingWizard — reload survival via localStorage draft", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPatchSession.mockResolvedValue({ currentStep: "bank", completedSteps: [], data: {} });
    mockUsePatchOnboardingSessionMutation.mockReturnValue({
      mutateAsync: mockPatchSession,
    });
    mockUseBankDetailsQuery.mockReturnValue({
      data: undefined, error: null, isLoading: false, refetch: jest.fn(),
    });
    mockUsePersonalDetailsQuery.mockReturnValue({
      data: undefined, error: null, isLoading: false, refetch: jest.fn(),
    });
  });

  it("when localStorage has a saved draft the wizard restores it on mount", () => {
    const storedDraft = {
      personal: PERSONAL_DRAFT,
      bank: BANK_DRAFT,
    };

    const { loadOnboardingDraft } = jest.requireMock<
      typeof import("@/features/employee-onboarding/lib/draft-storage")
    >("@/features/employee-onboarding/lib/draft-storage");

    (loadOnboardingDraft as jest.Mock).mockReturnValue(storedDraft);

    mockUseOnboardingSessionQuery.mockReturnValue(makeSession("bank", ["personal"]));

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    const { result } = renderHook(() => useOnboardingWizard());

    expect(result.current.wizardDraft.personal.phone).toBe(PERSONAL_DRAFT.phone);
    expect(result.current.wizardDraft.bank.accountHolder).toBe(BANK_DRAFT.accountHolder);
    expect(result.current.wizardDraft.bank.accountNumber).toBe(BANK_DRAFT.accountNumber);
  });

  it("when localStorage is empty the draft falls back to server session data merged with prefill", () => {
    const { loadOnboardingDraft } = jest.requireMock<
      typeof import("@/features/employee-onboarding/lib/draft-storage")
    >("@/features/employee-onboarding/lib/draft-storage");

    (loadOnboardingDraft as jest.Mock).mockReturnValue(null);

    mockUseOnboardingSessionQuery.mockReturnValue(makeSession("personal", []));
    mockUsePersonalDetailsQuery.mockReturnValue({
      data: { phone: "+919999999999", gender: null, dateOfBirth: null, addressLine1: null, addressCity: null, addressState: null, addressPostalCode: null, addressCountry: null, emergencyName: null, emergencyRelation: null, emergencyPhone: null },
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    });

    const { useOnboardingWizard } = jest.requireActual<
      typeof import("@/features/employee-onboarding/hooks/use-onboarding-wizard")
    >("@/features/employee-onboarding/hooks/use-onboarding-wizard");

    const { result } = renderHook(() => useOnboardingWizard());

    expect(result.current.wizardDraft.personal.phone).toBe("+919999999999");
  });
});
