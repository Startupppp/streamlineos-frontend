import { fireEvent, render, screen } from "@testing-library/react";
import type { FnfSuggestion } from "@/hooks/api/payroll/fnf-schema";

const suggestion: FnfSuggestion = {
  userId: "user_1",
  joiningDate: "2020-07-15",
  lastWorkingDay: "2026-02-20",
  lastDrawnBasic: "26000.00",
  basicMonth: "2026-01",
  serviceYears: 5,
  serviceMonths: 7,
  gratuityYears: 6,
  gratuityEligible: true,
  gratuityCapped: false,
  gratuity: "90000.00",
  encashableLeaveDays: "12.50",
  leaveEncashment: "12500.00",
  notes: ["Notice-period pay or recovery is not suggested. Enter it manually."],
};

const useFnfSuggestion = jest.fn();
jest.mock("@/hooks/api/payroll/fnf", () => ({
  useFnfSuggestion: (...args: unknown[]) => useFnfSuggestion(...args),
}));
jest.mock("@/hooks/api/org-display", () => ({ useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }) }));

import { FnfSuggestionPanel } from "./fnf-suggestion-panel";

describe("F&F suggested amounts", () => {
  it("shows the formula inputs and hands the suggestion over only when asked", () => {
    useFnfSuggestion.mockReturnValue({ data: suggestion, isLoading: false, isError: false, error: null });
    const onApply = jest.fn();
    render(<FnfSuggestionPanel userId="user_1" onApply={onApply} />);

    expect(screen.getByText(/15\/26 × basic × 6 years/)).toBeInTheDocument();
    expect(screen.getByText(/12.50 days × basic\/26/)).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Fill suggested amounts" }));
    expect(onApply).toHaveBeenCalledWith(suggestion);
  });

  it("renders nothing until an employee is chosen", () => {
    useFnfSuggestion.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    const { container } = render(<FnfSuggestionPanel userId="" onApply={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
