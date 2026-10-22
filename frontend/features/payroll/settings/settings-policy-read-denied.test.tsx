import { render, screen } from "@testing-library/react";

const mockUseCan = jest.fn();
const mockUsePayrollPolicyCurrent = jest.fn();

const mockAccessFailed = { current: false };
const mockRefetchAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: (key: string) => {
    const resolved = !mockAccessFailed.current && mockUseCan(key) !== undefined;
    const allowed = resolved && mockUseCan(key) === true;
    return { permission: key, allowed, denied: resolved && !allowed, pending: false, unavailable: mockAccessFailed.current };
  },
  useAccess: () => ({ refetch: mockRefetchAccess }),
}));

jest.mock("@/hooks/api/payroll", () => ({
  usePayrollPolicyCurrent: () => mockUsePayrollPolicyCurrent(),
}));

jest.mock("./policy-profile-section", () => ({ PolicyProfileSection: () => <div>policy profile</div> }));
jest.mock("./toggle-settings-section", () => ({ ToggleSettingsSection: () => null }));
jest.mock("./version-history-section", () => ({ VersionHistorySection: () => null }));
jest.mock("./calendar-section", () => ({ CalendarSection: () => null }));
jest.mock("./fx-rates-section", () => ({ FxRatesSection: () => null }));
jest.mock("./entities-section", () => ({ EntitiesSection: () => null }));

import { SettingsPageContent } from "./settings-page";

describe("payroll settings distinguishes a policy it cannot read from a policy that does not exist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccessFailed.current = false;
    mockUsePayrollPolicyCurrent.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("renders the configured policy when the reader holds both keys, so the negatives below are not passing on a page that never renders", () => {
    mockUseCan.mockReturnValue(true);
    mockUsePayrollPolicyCurrent.mockReturnValue({
      data: { policy: { id: 1, status: "ACTIVE" } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<SettingsPageContent />);
    expect(screen.getByText("policy profile")).toBeInTheDocument();
    expect(screen.queryByText("Payroll not set up yet")).not.toBeInTheDocument();
  });

  it("says the policy cannot be read, not that payroll is unset, when the view key is withdrawn", () => {
    mockUseCan.mockImplementation((key: string) => key !== "payroll:policies:view");
    render(<SettingsPageContent />);
    expect(screen.getByText("You cannot view the payroll policy")).toBeInTheDocument();
    expect(screen.queryByText("Payroll not set up yet")).not.toBeInTheDocument();
  });

  it("offers no Set up Payroll action to a reader who cannot tell whether it is already set up", () => {
    mockUseCan.mockImplementation((key: string) => key !== "payroll:policies:view");
    render(<SettingsPageContent />);
    expect(screen.queryByRole("link", { name: /set up payroll/i })).not.toBeInTheDocument();
  });

  it("still reports an unset payroll to a reader who can see the policy", () => {
    mockUseCan.mockReturnValue(true);
    render(<SettingsPageContent />);
    expect(screen.getByText("Payroll not set up yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /set up payroll/i })).toBeInTheDocument();
  });

  it("asks about the policy view key rather than the page's own manage key", () => {
    mockUseCan.mockReturnValue(true);
    render(<SettingsPageContent />);
    expect(mockUseCan).toHaveBeenCalledWith("payroll:policies:view");
  });

  it("BUG-027: a failed access read is an error with a retry, not a permanent 'cannot view' panel", () => {
    mockAccessFailed.current = true;
    render(<SettingsPageContent />);
    expect(screen.queryByText("You cannot view the payroll policy")).not.toBeInTheDocument();
    expect(screen.getByText("Failed to load settings")).toBeInTheDocument();
    screen.getByRole("button", { name: /try again/i }).click();
    expect(mockRefetchAccess).toHaveBeenCalled();
  });
});
