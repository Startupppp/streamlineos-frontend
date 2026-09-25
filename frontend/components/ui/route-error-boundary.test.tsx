import { act, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import {
  MAX_NETWORK_AUTO_RETRIES,
  NETWORK_RETRY_BUDGET_TTL_MS,
  RouteErrorBoundary,
  resetNetworkRetryBudgets,
  shouldReportRouteError,
} from "./route-error-boundary";

function networkError(path: string): Error & { digest?: string } {
  return new ApiError(
    `Network error contacting localhost:1500 (GET ${path}). Check your connection and try again.`,
    undefined,
    "NETWORK_ERROR",
    { method: "GET", path },
  );
}

const OUTAGE_PATHS = [
  "/billing",
  "/dashboard/stats",
  "/notifications",
  "/announcements",
  "/hr/birthdays",
  "/hr/leaves-today",
  "/build/my-issues",
  "/me",
];

function mountOutage(reset: jest.Mock, path: string, elapsedMs: number) {
  const view = render(<RouteErrorBoundary error={networkError(path)} reset={reset} />);
  act(() => {
    jest.advanceTimersByTime(elapsedMs);
  });
  view.unmount();
}

function spendWholeBudget(reset: jest.Mock) {
  mountOutage(reset, "/billing", 3_000);
  mountOutage(reset, "/dashboard/stats", 6_000);
  mountOutage(reset, "/notifications", 12_000);
}

beforeEach(() => {
  jest.useFakeTimers();
  resetNetworkRetryBudgets();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("the network auto-retry budget belongs to the route, not to the message", () => {
  it("spends one budget for a whole outage instead of one per failing endpoint", () => {
    const reset = jest.fn();

    for (const path of OUTAGE_PATHS) mountOutage(reset, path, 4_000);

    expect(reset.mock.calls.length).toBeLessThanOrEqual(MAX_NETWORK_AUTO_RETRIES);
    expect(reset).toHaveBeenCalled();
  });

  it("stops retrying once the budget is spent, even as the failing endpoint rotates", () => {
    const reset = jest.fn();

    spendWholeBudget(reset);
    expect(reset).toHaveBeenCalledTimes(MAX_NETWORK_AUTO_RETRIES);
    reset.mockClear();

    mountOutage(reset, "/some/endpoint/that/has/not/failed/yet", 12_000);

    expect(reset).not.toHaveBeenCalled();
  });

  it("gives a later outage a fresh budget rather than never retrying again", () => {
    const reset = jest.fn();

    spendWholeBudget(reset);
    reset.mockClear();

    act(() => {
      jest.advanceTimersByTime(NETWORK_RETRY_BUDGET_TTL_MS + 1_000);
    });
    mountOutage(reset, "/billing", 3_000);

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("never auto-retries an error that is not a transient network failure", () => {
    const reset = jest.fn();

    render(
      <RouteErrorBoundary
        error={new ApiError("Forbidden", 403, "FORBIDDEN")}
        reset={reset}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(reset).not.toHaveBeenCalled();
  });
});

describe("shouldReportRouteError", () => {
  it("does not report a permission snapshot miss while the route is still auto-retrying", () => {
    const error = new Error("Could not load your permissions. Please try again.");
    error.name = "AccessUnavailableError";

    expect(shouldReportRouteError(error, "/build/command-center")).toBe(false);
  });

  it("reports a permission snapshot miss after the auto-retry budget is spent", () => {
    const error = new Error("Could not load your permissions. Please try again.");
    error.name = "AccessUnavailableError";
    const reset = jest.fn();
    const routeKey = window.location.pathname;

    spendWholeBudget(reset);

    expect(shouldReportRouteError(error, routeKey)).toBe(true);
  });

  it("still reports a non-transient failure immediately", () => {
    expect(shouldReportRouteError(new Error("boom"), "/build/command-center")).toBe(true);
  });

  it("does not report an expected missing-record response", () => {
    expect(shouldReportRouteError(new ApiError("Not found", 404, "NOT_FOUND"), "/build/teams/1")).toBe(false);
  });
});

describe("access denials that escape a query render the shared page state instead of a generic card", () => {
  it("names the module instead of showing Project error when a plan gate rejects the read", () => {
    const error = Object.assign(
      new ApiError("This module is not available on your plan.", 402, "MODULE_NOT_ENABLED", {
        moduleKey: "feedbucket",
        reason: "org-disabled",
        upgradePath: null,
      }),
      { digest: undefined },
    );

    render(<RouteErrorBoundary error={error} reset={jest.fn()} title="Project error" />);

    expect(screen.queryByText("Project error")).toBeNull();
    expect(screen.getByRole("link", { name: /modules/i })).toBeInTheDocument();
  });
});
