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

const OK = {
  isPending: false,
  isError: false,
  error: null,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
};

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
    data: { pages: [{ rows: [], pagination: { limit: 20, hasMore: false, nextCursor: null } }] },
    refetch: jest.fn(),
  });
});

describe("the drilldown sheet never reports a count it could not read", () => {
  it("reports the failure instead of an empty table when the read 500d", () => {
    const refetch = jest.fn();
    drilldown.mockReturnValue({
      ...OK,
      data: undefined,
      isPending: false,
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
  });

  it("still shows the honest empty table when the read genuinely returned no rows", () => {
    renderSheet();

    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still shows data rows when the read returned rows", () => {
    drilldown.mockReturnValue({
      ...OK,
      data: { pages: [{ rows: [{ name: "Ada" }], pagination: { limit: 20, hasMore: false, nextCursor: null } }] },
      refetch: jest.fn(),
    });
    renderSheet();

    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
