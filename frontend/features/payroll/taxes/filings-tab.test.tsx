import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { FilingsTab } from "./filings-tab";

const mockUsePayrollFilings = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/payroll/filings", () => ({
  usePayrollFilings: () => mockUsePayrollFilings(),
  useFilingCapabilities: () => ({ data: undefined }),
  useAttachAcknowledgement: () => ({ mutate: jest.fn(), isPending: false }),
  downloadFilingExport: jest.fn(),
}));

jest.mock("@/hooks/api/payroll/entities", () => ({
  usePayrollEntities: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

jest.mock("./filing-export-dialog", () => ({
  FilingExportDialog: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("the filings tab distinguishes a failed load from no filings", () => {
  it("offers retry on a failed load instead of 'No filings prepared'", () => {
    mockUsePayrollFilings.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    render(<FilingsTab />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load filings/i);
    expect(screen.queryByText(/no filings prepared/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the empty state when no filing has been prepared", () => {
    mockUsePayrollFilings.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<FilingsTab />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/no filings prepared/i)).toBeInTheDocument();
  });
});
