import type { QueryClient } from "@tanstack/react-query";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const CALENDAR_PROJECTION_SIGNAL_KEY = "streamlineos:calendar-projection-change";

function signalCalendarProjectionChange(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CALENDAR_PROJECTION_SIGNAL_KEY,
      `${Date.now()}:${Math.random()}`,
    );
  } catch {}
}

export function invalidateCalendarProjectionWindows(
  queryClient: QueryClient,
  broadcast = true,
): void {
  void queryClient.invalidateQueries({
    queryKey: platformHierarchyQueryKeys.calendar.eventsAll,
  });
  void queryClient.invalidateQueries({
    queryKey: platformHierarchyQueryKeys.calendar.hrSupplementalAll,
  });
  void queryClient.invalidateQueries({
    queryKey: platformHierarchyQueryKeys.calendar.externalEventsAll,
  });
  void queryClient.invalidateQueries({
    queryKey: humanResourcesQueryKeys.hr.monthlyAttendanceAll,
  });
  void queryClient.invalidateQueries({
    queryKey: humanResourcesQueryKeys.hr.wfhRequestsAll,
  });
  if (broadcast) signalCalendarProjectionChange();
}

export function subscribeToCalendarProjectionChanges(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === CALENDAR_PROJECTION_SIGNAL_KEY && event.newValue !== null) {
      listener();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}
