import { QueryClient } from "@tanstack/react-query";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import {
  CALENDAR_PROJECTION_SIGNAL_KEY,
  invalidateCalendarProjectionWindows,
  subscribeToCalendarProjectionChanges,
} from "@/lib/calendar-projection-cache";

const START = "2026-10-01T00:00:00.000Z";
const END = "2026-11-01T00:00:00.000Z";

describe("calendar projection cache", () => {
  beforeEach(() => window.localStorage.clear());

  it("invalidates every cached organization window when the old date is unknown", async () => {
    const client = new QueryClient();
    const orgOne = platformHierarchyQueryKeys.calendar.events("org-1", "user-1", START, END);
    const orgTwo = platformHierarchyQueryKeys.calendar.events("org-2", "user-2", START, END);
    const hr = platformHierarchyQueryKeys.calendar.hrSupplemental("org-1", "2026-10-01", "2026-10-31");
    const external = platformHierarchyQueryKeys.calendar.externalEvents("org-1", "user-1", START, END);
    const search = platformHierarchyQueryKeys.calendar.search("org-1", "user-1", 7, 1, "all", true, { start: START, end: END });
    const detail = platformHierarchyQueryKeys.calendar.eventDetail(7);
    const attendance = humanResourcesQueryKeys.hr.monthlyAttendance({
      orgId: "org-1",
      actorUserId: "user-1",
      year: 2026,
      month: 9,
    });
    const wfh = humanResourcesQueryKeys.hr.wfhRequests("org-1", "user-1");
    client.setQueryData(orgOne, { events: [] });
    client.setQueryData(orgTwo, { events: [] });
    client.setQueryData(hr, []);
    client.setQueryData(external, { events: [] });
    client.setQueryData(search, { pages: [] });
    client.setQueryData(detail, { id: 7 });
    client.setQueryData(attendance, []);
    client.setQueryData(wfh, []);

    invalidateCalendarProjectionWindows(client);
    await Promise.resolve();

    expect(client.getQueryState(orgOne)?.isInvalidated).toBe(true);
    expect(client.getQueryState(orgTwo)?.isInvalidated).toBe(true);
    expect(client.getQueryState(hr)?.isInvalidated).toBe(true);
    expect(client.getQueryState(external)?.isInvalidated).toBe(true);
    expect(client.getQueryState(search)?.isInvalidated).toBe(true);
    expect(client.getQueryState(detail)?.isInvalidated).toBe(false);
    expect(client.getQueryState(attendance)?.isInvalidated).toBe(true);
    expect(client.getQueryState(wfh)?.isInvalidated).toBe(true);
    expect(window.localStorage.getItem(CALENDAR_PROJECTION_SIGNAL_KEY)).toMatch(/^\d+:0\.\d+$/);
  });

  it("receives a data free change signal from another tab and stops after unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToCalendarProjectionChanges(listener);
    window.dispatchEvent(new StorageEvent("storage", {
      key: CALENDAR_PROJECTION_SIGNAL_KEY,
      newValue: "1728777600000:0.5",
    }));
    window.dispatchEvent(new StorageEvent("storage", {
      key: "streamlineos:other",
      newValue: "private-record",
    }));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", {
      key: CALENDAR_PROJECTION_SIGNAL_KEY,
      newValue: "1728777600001:0.6",
    }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
