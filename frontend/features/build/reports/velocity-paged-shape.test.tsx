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

function page(cycles: ReturnType<typeof cycle>[]) {
  return { data: cycles, pagination: { limit: 100, hasMore: false, nextCursor: null } };
}

const THREE_CYCLES_RESULT = {
  data: { pages: [page([cycle(1, "Cycle 1"), cycle(2, "Cycle 2"), cycle(3, "Cycle 3")])], pageParams: [undefined] },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseVelocityReport.mockReturnValue(THREE_CYCLES_RESULT);
  mockUseBurnupReport.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
});

describe("useVelocityReport returns cursor envelope; consumers read pages.flatMap(p => p.data)", () => {
  it("renders the burnup cycle selector when data holds cycles — positive control confirms cycles reach the selector", () => {
    render(<BurnupSection projectId={1} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders no cycle selector when data is empty — negative control confirms the selector is not unconditionally rendered", () => {
    mockUseVelocityReport.mockReturnValue({
      ...THREE_CYCLES_RESULT,
      data: { pages: [page([])], pageParams: [undefined] },
    });
    render(<BurnupSection projectId={1} />);

    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("requests burnup for the last cycle in the flattened data, not for undefined", () => {
    render(<BurnupSection projectId={1} />);

    expect(mockUseBurnupReport).toHaveBeenCalledWith(1, 3);
  });

  it("exports one CSV row per cycle across all pages", async () => {
    render(<ReportsExportButton projectId={1} />);

    await userEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(mockExportToCsv).toHaveBeenCalledTimes(1);
    const rows = mockExportToCsv.mock.calls[0]?.[1];
    expect(rows).toHaveLength(3);
  });

  it("exports nothing when data is empty — negative control confirms export is data-gated", async () => {
    mockUseVelocityReport.mockReturnValue({
      ...THREE_CYCLES_RESULT,
      data: { pages: [page([])], pageParams: [undefined] },
    });
    render(<ReportsExportButton projectId={1} />);

    await userEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(mockExportToCsv).not.toHaveBeenCalled();
  });

  it("exports cycles from multiple pages when second page exists — positive: flatMap spans pages", async () => {
    mockUseVelocityReport.mockReturnValue({
      ...THREE_CYCLES_RESULT,
      data: {
        pages: [
          page([cycle(1, "Cycle 1"), cycle(2, "Cycle 2")]),
          page([cycle(3, "Cycle 3")]),
        ],
        pageParams: [undefined, "cursor-1"],
      },
    });
    render(<ReportsExportButton projectId={1} />);

    await userEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(mockExportToCsv).toHaveBeenCalledTimes(1);
    const rows = mockExportToCsv.mock.calls[0]?.[1];
    expect(rows).toHaveLength(3);
  });
});
