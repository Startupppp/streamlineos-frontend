import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";

const periods = jest.fn();
const refetch = jest.fn();
const idleMutation = { mutate: jest.fn(), isPending: false };

jest.mock("@/hooks/api/payroll/payroll-inputs", () => ({
  usePayrollInputPeriods: () => periods(),
  useCreatePayrollInputPeriod: () => idleMutation,
  useBuildPayrollInputPeriod: () => idleMutation,
  useLockPayrollInputPeriod: () => idleMutation,
  useUnlockPayrollInputPeriod: () => idleMutation,
}));

jest.mock("@/features/payroll/inputs/inputs-section-tabs", () => ({
  InputsSectionTabs: () => null,
}));

jest.mock("@/features/payroll/inputs/create-adjustment-dialog", () => ({
  CreateAdjustmentDialog: () => null,
}));

import { InputsPageContent } from "./inputs-page-content";

beforeEach(() => {
  jest.clearAllMocks();
  periods.mockReturnValue({
    data: { data: [] },
    isLoading: false,
    error: null,
    refetch,
  });
});

describe("HRMS-B3-021 the payroll inputs page reports what actually failed", () => {
  it("renders the inputs page on a healthy session, so the failure cases below are not passing on a page that never mounts", () => {
    render(<InputsPageContent />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/payroll inputs/i);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the server's own message rather than a fixed Could not load data line", () => {
    const error = new ApiError("Too many requests", 429);
    periods.mockReturnValue({ data: undefined, isLoading: false, error, refetch });
    render(<InputsPageContent />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(getErrorMessage(error))).toBeInTheDocument();
    expect(screen.queryByText(/could not load data\. please try again\./i)).toBeNull();
  });

  it("quotes the failed call's request id, so the operator can hand it to support", () => {
    periods.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError("Internal server error", 500, "INTERNAL", {
        correlationId: "req_77b0ea",
      }),
      refetch,
    });
    render(<InputsPageContent />);

    expect(screen.getByText("req_77b0ea")).toBeInTheDocument();
  });
});
