export const HOME_ACCESS_DEADLINE_MS = 2_500;

interface DashboardLoadingState {
  accessLoading: boolean;
  accessDeadlineElapsed: boolean;
  mounted: boolean;
}

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

export function shouldRenderAccessUnavailable({
  accessLoading,
  accessResolved,
  accessDeadlineElapsed,
}: AccessAvailabilityState): boolean {
  if (accessResolved) return false;
  return accessDeadlineElapsed && accessLoading;
}
