import { act, fireEvent, render, screen } from "@testing-library/react";
import { EmployeesTab } from "./employees-tab";

const mockUseRunEmployees = jest.fn();

const ROW = {
  id: 1,
  userId: "u1",
  workerType: "EMPLOYEE",
  currency: "INR",
  gross: "100000",
  totalDeductions: "2000",
  net: "98000",
  status: "PENDING",
  holdReason: null,
  userName: "Priem QA",
  userEmail: "priem@example.com",
};

jest.mock("@/hooks/api/payroll/run-employees", () => ({
  useRunEmployees: (runId: number, params?: unknown) =>
    mockUseRunEmployees(runId, params),
}));

jest.mock("./breakdown-sheet", () => ({
  BreakdownSheet: () => null,
}));

function searchesRequested(): (string | undefined)[] {
  return mockUseRunEmployees.mock.calls.map((call) => {
    const params: unknown = call[1];
    if (typeof params !== "object" || params === null) return undefined;
    const search = Reflect.get(params, "search");
    return typeof search === "string" ? search : undefined;
  });
}

function distinctSearches(): string[] {
  return [
    ...new Set(searchesRequested().filter((value): value is string => Boolean(value))),
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockUseRunEmployees.mockReturnValue({
    data: { data: [], pagination: { hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("BUG-015 payroll run employees search", () => {
  it("passes no search param at all before anything is typed, so an empty box is not a filtered read", () => {
    render(<EmployeesTab runId={7} />);

    expect(searchesRequested()).toEqual([undefined]);
  });

  it("sends no request for the intermediate keystrokes of a burst — only the value standing after the 300ms pause", () => {
    render(<EmployeesTab runId={7} />);
    const field = screen.getByRole("searchbox");

    for (const value of ["p", "pr", "pri", "prie", "priem"]) {
      act(() => {
        fireEvent.change(field, { target: { value } });
      });
    }

    expect(distinctSearches()).toEqual([]);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(distinctSearches()).toEqual(["priem"]);
  });

  it("keeps the typed value on screen while the request waits, so the field never lags the keyboard", () => {
    render(<EmployeesTab runId={7} />);
    const field = screen.getByRole("searchbox");

    act(() => {
      fireEvent.change(field, { target: { value: "priem" } });
    });

    expect(field).toHaveValue("priem");
    expect(distinctSearches()).toEqual([]);
  });

  it("trims the query, so a trailing space is not a different search than the word alone", () => {
    render(<EmployeesTab runId={7} />);

    act(() => {
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "  priem  " },
      });
      jest.advanceTimersByTime(300);
    });

    expect(distinctSearches()).toEqual(["priem"]);
  });

  it("offers numbered cursor pagination rather than a reveal button, so a reader can go back a page (FE-125)", () => {
    mockUseRunEmployees.mockReturnValue({
      data: { data: [ROW], pagination: { hasMore: true, nextCursor: "c2" } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<EmployeesTab runId={7} />);

    expect(screen.queryByRole("button", { name: /load next page/i })).toBeNull();
    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
  });
});
