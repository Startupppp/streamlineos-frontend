import { fireEvent, render, screen } from "@testing-library/react";
import { TaxWindowsTab } from "./tax-windows-tab";

const mutate = jest.fn();
const mockUseTaxWindows = jest.fn();
const mockUseUpdateTaxWindow = jest.fn();

jest.mock("@/hooks/api/payroll/tax-windows", () => ({
  useTaxWindows: () => mockUseTaxWindows(),
  useUpdateTaxWindow: () => mockUseUpdateTaxWindow(),
}));

jest.mock("./tax-window-sheet", () => ({
  TaxWindowSheet: () => null,
}));

const CLOSED_WINDOW = {
  id: 4,
  orgId: "org-1",
  financialYear: "2025-26",
  opensAt: "2026-04-01",
  closesAt: "2026-06-30",
  proofDeadline: "2026-07-15",
  lockDate: "2026-07-31",
  status: "CLOSED",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
};

function renderWith(isPending: boolean) {
  mockUseTaxWindows.mockReturnValue({
    data: [CLOSED_WINDOW],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseUpdateTaxWindow.mockReturnValue({ mutate, isPending });
  render(<TaxWindowsTab />);
  fireEvent.click(screen.getByRole("button", { name: /lock/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BUG-014 tax window status confirm", () => {
  it("opens the confirm and enables it while nothing is in flight, so the negative below is not passing on a control that cannot render", () => {
    renderWith(false);

    expect(screen.getByRole("button", { name: /^confirm$/i })).toBeEnabled();
  });

  it("commits exactly one status update for a first confirm", () => {
    renderWith(false);
    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ taxWindowId: 4, status: "LOCKED" });
  });

  it("disables the confirm while the update is in flight, so a second click cannot lock the window twice", () => {
    renderWith(true);

    expect(screen.getByRole("button", { name: /^confirm$/i })).toBeDisabled();
  });

  it("ignores a click on the disabled confirm, so rapid double-activation fires one mutation at most", () => {
    renderWith(true);
    const confirm = screen.getByRole("button", { name: /^confirm$/i });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(mutate).not.toHaveBeenCalled();
  });

  it("holds the dialog open while the update is in flight, so the outcome is not hidden behind a dismissed dialog", () => {
    renderWith(true);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("keeps Cancel reachable before the confirm, so an operator can back out of locking a live window", () => {
    renderWith(false);

    expect(screen.getByRole("button", { name: /cancel/i })).toBeEnabled();
  });
});
