import {
  HOME_ACCESS_DEADLINE_MS,
  isSetupBannerSlotPending,
  shouldRenderAccessUnavailable,
  shouldRenderDashboardLoading,
} from "./dashboard-hydration";

describe("shouldRenderDashboardLoading", () => {
  it("keeps the loading header through the first client render", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        accessDeadlineElapsed: false,
        mounted: false,
        setupBannersPending: false,
      }),
    ).toBe(true);
  });

  it("renders dashboard data after the initial mount", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        accessDeadlineElapsed: false,
        mounted: true,
        setupBannersPending: false,
      }),
    ).toBe(false);
  });

  it("waits for access, because every widget gate depends on it", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: true,
        accessDeadlineElapsed: false,
        mounted: true,
        setupBannersPending: false,
      }),
    ).toBe(true);
  });

  it("waits for the setup banners, which are inserted above the widget grid", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        accessDeadlineElapsed: false,
        mounted: true,
        setupBannersPending: true,
      }),
    ).toBe(true);
  });

  it("holds the page while access is in flight and the deadline has not passed", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: true,
        accessDeadlineElapsed: false,
        mounted: true,
        setupBannersPending: false,
      }),
    ).toBe(true);
  });

  it("stops waiting on access once the deadline passes, so a hung /me/access cannot hold every ready section behind it", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: true,
        accessDeadlineElapsed: true,
        mounted: true,
        setupBannersPending: false,
      }),
    ).toBe(false);
  });

  it("still holds the page before hydration, deadline or not", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: true,
        accessDeadlineElapsed: true,
        mounted: false,
        setupBannersPending: false,
      }),
    ).toBe(true);
  });

  it("matches the server section deadline, so the client never waits longer than the server already did", () => {
    expect(HOME_ACCESS_DEADLINE_MS).toBe(2_500);
  });
});

describe("shouldRenderAccessUnavailable", () => {
  it("hands back an error surface, NOT a zero-widget grid, when the deadline passes on an unanswered access read", () => {
    expect(
      shouldRenderAccessUnavailable({
        accessLoading: true,
        accessResolved: false,
        accessDeadlineElapsed: true,
      }),
    ).toBe(true);
  });

  it("says nothing while access is still inside its deadline", () => {
    expect(
      shouldRenderAccessUnavailable({
        accessLoading: true,
        accessResolved: false,
        accessDeadlineElapsed: false,
      }),
    ).toBe(false);
  });

  it("says nothing once access answers, however late", () => {
    expect(
      shouldRenderAccessUnavailable({
        accessLoading: false,
        accessResolved: true,
        accessDeadlineElapsed: true,
      }),
    ).toBe(false);
  });

  it("says nothing when the access read never started — a disabled query is not a failed one", () => {
    expect(
      shouldRenderAccessUnavailable({
        accessLoading: false,
        accessResolved: false,
        accessDeadlineElapsed: true,
      }),
    ).toBe(false);
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
