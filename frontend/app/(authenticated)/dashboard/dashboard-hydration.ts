interface DashboardLoadingState {
  accessLoading: boolean;
  isLoading: boolean;
  mounted: boolean;
}

export function shouldRenderDashboardLoading({
  accessLoading,
  isLoading,
  mounted,
}: DashboardLoadingState): boolean {
  return !mounted || isLoading || accessLoading;
}
