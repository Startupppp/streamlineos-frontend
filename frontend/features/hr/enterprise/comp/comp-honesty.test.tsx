import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { VestingTimeline } from "./vesting-timeline";
import { CompCycleDetail } from "./comp-cycle-detail";

const COMP_HOOKS = join(process.cwd(), "hooks/api/hr/enterprise-comp.ts");

const vesting = jest.fn();
const cycle = jest.fn();
const recommendations = jest.fn();
const pools = jest.fn();

jest.mock("@/hooks/api/hr/enterprise-comp", () => ({
  useVestingSchedule: () => vesting(),
  useCompCycle: () => cycle(),
  useCompRecommendations: () => recommendations(),
  useBudgetPools: () => pools(),
  useCalibrateRecommendation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));

const OK = { isLoading: false, isError: false, error: null };

function failing(refetch: jest.Mock) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", 500, undefined, {
      correlationId: "req-lane3",
    }),
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  vesting.mockReturnValue({ ...OK, data: [], refetch: jest.fn() });
  cycle.mockReturnValue({ ...OK, data: { meritMatrix: {} }, refetch: jest.fn() });
  recommendations.mockReturnValue({
    ...OK,
    isFetching: false,
    data: { data: [], pagination: { hasMore: false, nextCursor: null } },
    refetch: jest.fn(),
  });
  pools.mockReturnValue({ ...OK, data: [], refetch: jest.fn() });
});

describe("HRMS-B2-020 / HRMS-B2-021 the equity and budget panels report a failure as a failure", () => {
  it("opts the vesting and budget-pool reads out of the /hr boundary, so their inline branches are reachable at all", () => {
    const source = readFileSync(COMP_HOOKS, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(source.match(/\.\.\.INLINE_READ_ERROR,/g) ?? []).toHaveLength(5);
  });

  it("does not claim a grant has no vesting schedule when the read 500d", () => {
    const refetch = jest.fn();
    vesting.mockReturnValue(failing(refetch));
    render(<VestingTimeline grantId={4} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load vesting schedule/i,
    );
    expect(screen.queryByText(/no vesting schedule/i)).toBeNull();
    expect(screen.getByText("req-lane3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest vesting empty state when the read genuinely returns no events", () => {
    render(<VestingTimeline grantId={4} />);

    expect(screen.getByText(/no vesting schedule/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the budget pools failure instead of omitting the section in silence", () => {
    const refetch = jest.fn();
    pools.mockReturnValue(failing(refetch));
    render(<CompCycleDetail cycleId={3} canManage={false} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load budget pools/i,
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("omits the budget pools section only when the cycle genuinely has none", () => {
    render(<CompCycleDetail cycleId={3} canManage={false} />);

    expect(screen.queryByText(/budget pools/i)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/no recommendations yet/i)).toBeInTheDocument();
  });
});
