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

const TWO_PAGES = {
  data: {
    pages: [
      { data: [cycle(1, "Cycle 1"), cycle(2, "Cycle 2")], pagination: { nextCursor: "c2" } },
      { data: [cycle(3, "Cycle 3")], pagination: { nextCursor: null } },
    ],
  },
  isLoading: false,
  isError: false,
  error: null,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseVelocityReport.mockReturnValue(TWO_PAGES);
  mockUseBurnupReport.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
});

describe("useVelocityReport is an infinite query, so its consumers must read pages rather than the result itself", () => {
  it("renders the burnup cycle selector when pages hold cycles, which reading velocity.data directly would suppress", () => {
    render(<BurnupSection projectId={1} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders no cycle selector when every page is empty, so the positive case above is the flattening and not an unconditional render", () => {
    mockUseVelocityReport.mockReturnValue({
      ...TWO_PAGES,
      data: { pages: [{ data: [], pagination: { nextCursor: null } }] },
    });
    render(<BurnupSection projectId={1} />);

    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("requests the burnup for the last cycle across all pages, not for undefined", () => {
    render(<BurnupSection projectId={1} />);

    expect(mockUseBurnupReport).toHaveBeenCalledWith(1, 3);
  });

  it("exports one CSV row per cycle across all pages, where reading the result as an array exported nothing at all", async () => {
    render(<ReportsExportButton projectId={1} />);

    await userEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(mockExportToCsv).toHaveBeenCalledTimes(1);
    const rows = mockExportToCsv.mock.calls[0]?.[1];
    expect(rows).toHaveLength(3);
  });

  it("exports nothing when no page holds a cycle, so the positive case above is the flattening and not an unconditional call", async () => {
    mockUseVelocityReport.mockReturnValue({
      ...TWO_PAGES,
      data: { pages: [{ data: [], pagination: { nextCursor: null } }] },
    });
    render(<ReportsExportButton projectId={1} />);

    await userEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(mockExportToCsv).not.toHaveBeenCalled();
  });
});
