interface DashboardLoadingState {
  accessLoading: boolean;
  mounted: boolean;
}

/**
 * Only hydration and access gate the page. A slow section renders its own
 * skeleton so one query cannot blank every other widget.
 */
export function shouldRenderDashboardLoading({
  accessLoading,
  mounted,
}: DashboardLoadingState): boolean {
  return !mounted || accessLoading;
}
