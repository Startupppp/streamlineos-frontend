import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { AttritionForecastCard } from "./attrition-forecast-card";

const WORKFORCE_HOOKS = join(process.cwd(), "hooks/api/hr/workforce.ts");

const forecast = jest.fn();
const pageState = jest.fn<PageStateResolution, []>();

jest.mock("@/hooks/api/hr/workforce", () => ({
  useHrAttritionForecast: () => forecast(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => pageState(),
}));

const OK = { isLoading: false, isError: false, error: null };

beforeEach(() => {
  jest.clearAllMocks();
  pageState.mockReturnValue({ kind: "ready" });
  forecast.mockReturnValue({
    ...OK,
    data: { historical: [], forecast: [], disclaimer: null },
    refetch: jest.fn(),
  });
});

describe("HRMS-B3-016 the attrition forecast never states a trend it could not read", () => {
  it("opts the forecast read out of the /hr boundary, so its inline branch is reachable at all", () => {
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(readFileSync(WORKFORCE_HOOKS, "utf8")).toContain("...INLINE_READ_ERROR,");
  });

  it("does not claim no exits were recorded when the read 500d", () => {
    const refetch = jest.fn();
    forecast.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, {
      correlationId: "req-lane3",
    }),
      refetch,
    });
    render(<AttritionForecastCard />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load attrition forecast/i,
    );
    expect(screen.queryByText(/no exits recorded/i)).toBeNull();
    expect(screen.getByText("req-lane3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says the forecast is refused rather than empty when hr:analytics:read is missing", () => {
    pageState.mockReturnValue({ kind: "denied", permission: "hr:analytics:read" });
    render(<AttritionForecastCard />);

    expect(screen.getByRole("status")).toHaveTextContent(/access restricted/i);
    expect(screen.queryByText(/no exits recorded/i)).toBeNull();
  });

  it("still says no exits were recorded when the read genuinely returns no history", () => {
    render(<AttritionForecastCard />);

    expect(screen.getByText(/no exits recorded/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
