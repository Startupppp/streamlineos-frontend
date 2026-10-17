import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import type { AccessState } from "@/lib/rbac/gate";
import { DrilldownSheet } from "./drilldown-sheet";

const drilldown = jest.fn();
const canState = jest.fn<AccessState, []>();

jest.mock("@/hooks/api/hr/analytics", () => ({
  useHrDrilldown: () => drilldown(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCanState: () => canState(),
}));

const OK = { isLoading: false, isError: false, error: null };

function renderSheet() {
  return render(
    <DrilldownSheet open onClose={jest.fn()} metric="headcount" title="Headcount" />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  canState.mockReturnValue("granted");
  drilldown.mockReturnValue({
    ...OK,
    data: { rows: [], total: 0, page: 1, limit: 20 },
    refetch: jest.fn(),
  });
});

describe("the drilldown sheet never reports a count it could not read", () => {
  it("reports the failure instead of an empty table and a zero total when the read 500d", () => {
    const refetch = jest.fn();
    drilldown.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, {
        correlationId: "req-lane-d",
      }),
      refetch,
    });
    renderSheet();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load these details/i);
    expect(screen.queryByText(/no data available/i)).toBeNull();
    expect(screen.getByText("req-lane-d")).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says the drilldown is refused, with no retry, when hr:analytics:read is missing", () => {
    canState.mockReturnValue("denied");
    drilldown.mockReturnValue({ ...OK, data: undefined, refetch: jest.fn() });
    renderSheet();

    expect(screen.getByRole("status")).toHaveTextContent(/access restricted/i);
    expect(screen.queryByText(/no data available/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("says the details could not be determined when the read never ran and never failed", () => {
    drilldown.mockReturnValue({ ...OK, data: undefined, refetch: jest.fn() });
    renderSheet();

    expect(screen.getByRole("status")).toHaveTextContent(/could not be determined/i);
    expect(screen.queryByText(/no data available/i)).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("still shows the honest empty table when the read genuinely returned no rows", () => {
    renderSheet();

    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still prints a genuine total when the read returned rows", () => {
    drilldown.mockReturnValue({
      ...OK,
      data: { rows: [{ name: "Ada" }], total: 1, page: 1, limit: 20 },
      refetch: jest.fn(),
    });
    renderSheet();

    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
