import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseVelocityReport = jest.fn();
const mockUseBurnupReport = jest.fn();
const mockExportToCsv = jest.fn();

jest.mock("@/hooks/api/build/reports", () => ({
  useVelocityReport: (...args: unknown[]) => mockUseVelocityReport(...args),
  useBurnupReport: (...args: unknown[]) => mockUseBurnupReport(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/lib/export-csv", () => ({
  exportToCsv: (...args: unknown[]) => mockExportToCsv(...args),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { BurnupSection } from "./burnup-section";
import { ReportsExportButton } from "./reports-export-button";

function cycle(cycleId: number, name: string) {
  return {
    cycleId,
    name,
    startDate: "2026-01-01",
    endDate: "2026-01-14",
    committedPoints: 10,
    completedPoints: 8,
    committedCount: 5,
    completedCount: 4,
  };
}

const THREE_CYCLES = {
  data: [cycle(1, "Cycle 1"), cycle(2, "Cycle 2"), cycle(3, "Cycle 3")],
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseVelocityReport.mockReturnValue(THREE_CYCLES);
  mockUseBurnupReport.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
});

describe("useVelocityReport returns a flat array; consumers must read data directly", () => {
  it("renders the burnup cycle selector when data holds cycles — positive control confirms cycles reach the selector", () => {
    render(<BurnupSection projectId={1} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders no cycle selector when data is empty — negative control confirms the selector is not unconditionally rendered", () => {
    mockUseVelocityReport.mockReturnValue({ ...THREE_CYCLES, data: [] });
    render(<BurnupSection projectId={1} />);

    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("requests burnup for the last cycle in the data array, not for undefined", () => {
    render(<BurnupSection projectId={1} />);

    expect(mockUseBurnupReport).toHaveBeenCalledWith(1, 3);
  });

  it("exports one CSV row per cycle in the data array", async () => {
    render(<ReportsExportButton projectId={1} />);

    await userEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(mockExportToCsv).toHaveBeenCalledTimes(1);
    const rows = mockExportToCsv.mock.calls[0]?.[1];
    expect(rows).toHaveLength(3);
  });

  it("exports nothing when data is empty — negative control confirms export is data-gated", async () => {
    mockUseVelocityReport.mockReturnValue({ ...THREE_CYCLES, data: [] });
    render(<ReportsExportButton projectId={1} />);

    await userEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(mockExportToCsv).not.toHaveBeenCalled();
  });
});
