import { shouldRenderDashboardLoading } from "./dashboard-hydration";

describe("shouldRenderDashboardLoading", () => {
  it("keeps the loading header through the first client render", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        mounted: false,
      }),
    ).toBe(true);
  });

  it("renders dashboard data after the initial mount", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        mounted: true,
      }),
    ).toBe(false);
  });

  it("waits for access, because every widget gate depends on it", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: true,
        mounted: true,
      }),
    ).toBe(true);
  });
});
