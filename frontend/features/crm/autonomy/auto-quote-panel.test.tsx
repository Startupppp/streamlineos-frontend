import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AutonomySettings } from "@/types/crm/autonomy";
import { AutoQuotePanel } from "./auto-quote-panel";

const mockSettings = jest.fn();
const mockUpdate = jest.fn();
const mockCan = jest.fn();

jest.mock("@/hooks/api/crm/autonomy", () => ({
  useAutonomySettings: () => mockSettings(),
  useUpdateAutonomySettings: () => mockUpdate(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => mockCan() }));

const settings = (over: Partial<AutonomySettings> = {}): AutonomySettings => ({
  shadowSampleRate: 0.1,
  shadowDailyCap: 500,
  holdWindowSeconds: 60,
  autoQuoteEnabled: false,
  ...over,
});

/**
 * CRM-P1-17. auto_quote_enabled has been on the settings row and in the PATCH
 * schema since the feature shipped, and both hooks existed with no consumer —
 * so it could only be turned on with a raw PATCH, and an organisation that
 * already had it on had nowhere to see that.
 */
describe("AutoQuotePanel", () => {
  beforeEach(() => {
    mockCan.mockReturnValue(true);
    mockUpdate.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false });
    mockSettings.mockReturnValue({ data: settings(), isLoading: false });
  });

  it("shows the setting as off when it is off", () => {
    render(<AutoQuotePanel />);
    expect(screen.getByRole("switch", { name: /draft quotes automatically/i })).not.toBeChecked();
    expect(screen.getByText(/only when somebody asks/i)).toBeInTheDocument();
  });

  it("turns it on", async () => {
    const mutate = jest.fn();
    mockUpdate.mockReturnValue({ mutate, isPending: false, isError: false });

    render(<AutoQuotePanel />);
    await userEvent.click(screen.getByRole("switch", { name: /draft quotes automatically/i }));

    expect(mutate).toHaveBeenCalledWith({ autoQuoteEnabled: true });
  });

  it("answers the question turning it on immediately raises", () => {
    /**
     * A drafted quote is not a sent quote. Showing the hold window beside the
     * toggle is what makes "the system will write quotes" readable as something
     * a person can still stop.
     */
    mockSettings.mockReturnValue({
      data: settings({ autoQuoteEnabled: true, holdWindowSeconds: 90 }),
      isLoading: false,
    });

    render(<AutoQuotePanel />);
    expect(screen.getByText(/90s before sending/i)).toBeInTheDocument();
  });

  it("does not offer the toggle to somebody who may only look", () => {
    mockCan.mockReturnValue(false);
    render(<AutoQuotePanel />);
    expect(screen.getByRole("switch", { name: /draft quotes automatically/i })).toBeDisabled();
    expect(screen.getByText(/needs the autonomy manage permission/i)).toBeInTheDocument();
  });

  it("says so when the change is refused", () => {
    mockUpdate.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: true,
      error: new Error("Platform kill switch is on."),
    });

    render(<AutoQuotePanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("Platform kill switch is on.");
  });
});
