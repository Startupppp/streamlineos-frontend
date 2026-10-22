import {
  HOME_ACCESS_DEADLINE_MS,
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
      }),
    ).toBe(true);
  });

  it("renders dashboard data after the initial mount", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: false,
        accessDeadlineElapsed: false,
        mounted: true,
      }),
    ).toBe(false);
  });

  it("waits for access, because every widget gate depends on it", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: true,
        accessDeadlineElapsed: false,
        mounted: true,
      }),
    ).toBe(true);
  });

  it("holds the page while access is in flight and the deadline has not passed", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: true,
        accessDeadlineElapsed: false,
        mounted: true,
      }),
    ).toBe(true);
  });

  it("stops waiting on access once the deadline passes, so a hung /me/access cannot hold every ready section behind it", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: true,
        accessDeadlineElapsed: true,
        mounted: true,
      }),
    ).toBe(false);
  });

  it("still holds the page before hydration, deadline or not", () => {
    expect(
      shouldRenderDashboardLoading({
        accessLoading: true,
        accessDeadlineElapsed: true,
        mounted: false,
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
