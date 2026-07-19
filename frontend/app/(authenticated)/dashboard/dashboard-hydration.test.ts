import { shouldRenderDashboardLoading } from "./dashboard-hydration";

describe("shouldRenderDashboardLoading", () => {
  it("keeps the loading header through the first client render", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        isLoading: false,
        mounted: false,
      }),
    ).toBe(true);
  });

  it("renders dashboard data after the initial mount", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        isLoading: false,
        mounted: true,
      }),
    ).toBe(false);
  });
});
