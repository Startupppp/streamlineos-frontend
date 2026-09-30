import { render, screen } from "@testing-library/react";

const mockUseCan = jest.fn();
const mockUsePayrollPolicyCurrent = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
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

/**
 * The page's own gate is `payroll:settings:manage`; the policy read underneath
 * it is gated on `payroll:policies:view`. A role holding only the first leaves
 * the read disabled, so `data` is undefined and `isLoading` is false — the same
 * state as "this organisation has no policy". The page used to read that as
 * "Payroll not set up yet", which is BUG-001's state-integrity lie reached
 * through a withdrawn grant instead of a missing row.
 */
describe("payroll settings distinguishes a policy it cannot read from a policy that does not exist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    // The old empty state carried that link, which would have walked a
    // manage-only role into re-running setup over a live payroll policy.
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
});
