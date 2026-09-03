interface DashboardLoadingState {
  accessLoading: boolean;
  mounted: boolean;
  setupBannersPending: boolean;
}

/**
 * Hydration, access and the one section that changes the layout above the fold
 * gate the page. A slow section still renders its own skeleton so one query
 * cannot blank every other widget — `setupBannersPending` is the exception,
 * because the module-setup banners are inserted ABOVE the widget grid and every
 * row below them moves when they land.
 */
export function shouldRenderDashboardLoading({
  accessLoading,
  mounted,
  setupBannersPending,
}: DashboardLoadingState): boolean {
  return !mounted || accessLoading || setupBannersPending;
}

interface SetupBannerSlotState {
  denied: boolean;
  isLoading: boolean;
  deadlineElapsed: boolean;
}

/**
 * Never holds the page on a read the viewer cannot make, and never holds it
 * past the deadline — a retrying or hung query hands the page back and the app
 * behaves as it did before this gate existed.
 */
export function isSetupBannerSlotPending({
  denied,
  isLoading,
  deadlineElapsed,
}: SetupBannerSlotState): boolean {
  if (denied || deadlineElapsed) return false;
  return isLoading;
}
