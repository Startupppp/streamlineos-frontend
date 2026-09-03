import {
  isSetupBannerSlotPending,
  shouldRenderDashboardLoading,
} from "./dashboard-hydration";

describe("shouldRenderDashboardLoading", () => {
  it("keeps the loading header through the first client render", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        mounted: false,
        setupBannersPending: false,
      }),
    ).toBe(true);
  });

  it("renders dashboard data after the initial mount", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        mounted: true,
        setupBannersPending: false,
      }),
    ).toBe(false);
  });

  it("waits for access, because every widget gate depends on it", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: true,
        mounted: true,
        setupBannersPending: false,
      }),
    ).toBe(true);
  });

  it("waits for the setup banners, which are inserted above the widget grid", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        mounted: true,
        setupBannersPending: true,
      }),
    ).toBe(true);
  });
});

describe("isSetupBannerSlotPending", () => {
  it("holds the page while the checklist read is in flight", () => {
    expect(
      isSetupBannerSlotPending({
        denied: false,
        isLoading: true,
        deadlineElapsed: false,
      }),
    ).toBe(true);
  });

  it("releases the page once the read answers", () => {
    expect(
      isSetupBannerSlotPending({
        denied: false,
        isLoading: false,
        deadlineElapsed: false,
      }),
    ).toBe(false);
  });

  it("never holds the page on a read the viewer cannot make", () => {
    expect(
      isSetupBannerSlotPending({
        denied: true,
        isLoading: true,
        deadlineElapsed: false,
      }),
    ).toBe(false);
  });

  it("hands the page back when the deadline passes, so a hung read cannot hold it", () => {
    expect(
      isSetupBannerSlotPending({
        denied: false,
        isLoading: true,
        deadlineElapsed: true,
      }),
    ).toBe(false);
  });
});
