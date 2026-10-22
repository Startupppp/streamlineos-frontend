/**
 * Matches the server's `HOME_SECTION_DEADLINE_MS`. Anything longer lets the
 * client hold a blank page past the point at which the server has already given
 * up on the same read and answered degraded.
 */
export const HOME_ACCESS_DEADLINE_MS = 2_500;

interface DashboardLoadingState {
  accessLoading: boolean;
  accessDeadlineElapsed: boolean;
  mounted: boolean;
}

/**
 * Hydration and access gate the page. A slow section still renders its own
 * skeleton so one query cannot blank every other widget.
 *
 * Access is time-boxed: it gates every widget's mount, so an `/me/access` read
 * that retries or hangs holds a zero-widget skeleton for the transport's
 * ceiling — 30s per attempt — while every section behind it is ready. Past the
 * deadline the page stops waiting; `shouldRenderAccessUnavailable` decides
 * what it shows instead.
 */
export function shouldRenderDashboardLoading({
  accessLoading,
  accessDeadlineElapsed,
  mounted,
}: DashboardLoadingState): boolean {
  return !mounted || (accessLoading && !accessDeadlineElapsed);
}

interface AccessAvailabilityState {
  accessLoading: boolean;
  accessResolved: boolean;
  accessDeadlineElapsed: boolean;
}

/**
 * The deadline releases the page; it must not release it into a widget grid.
 * `useDashboardAccess` resolves every gate to `false` while it has no data, so
 * rendering the grid on an unanswered access read would show a member the empty
 * Home of someone with no permissions — a failure dressed as an empty state.
 * The page says so instead, and offers the read again.
 */
export function shouldRenderAccessUnavailable({
  accessLoading,
  accessResolved,
  accessDeadlineElapsed,
}: AccessAvailabilityState): boolean {
  if (accessResolved) return false;
  return accessDeadlineElapsed && accessLoading;
}
