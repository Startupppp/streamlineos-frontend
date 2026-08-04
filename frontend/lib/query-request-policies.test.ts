import { createAppQueryClient } from "@/components/providers/query-provider";
import {
  ACTIVE_ATTENDANCE_POLL_INTERVAL_MS,
  DAILY_DATA_STALE_TIME_MS,
  NOTIFICATION_FALLBACK_INTERVAL_MS,
  requestBudgetForWindow,
} from "./query-request-policies";
import { queryKeys } from "./query-keys";

describe("query request policies", () => {
  it("does not refetch every stale query on focus", () => {
    const client = createAppQueryClient();

    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it("keeps five-minute idle request budgets bounded", () => {
    expect(requestBudgetForWindow(false, 300_000)).toBe(1);
    expect(
      requestBudgetForWindow(NOTIFICATION_FALLBACK_INTERVAL_MS, 300_000),
    ).toBeLessThanOrEqual(2);
    expect(
      requestBudgetForWindow(ACTIVE_ATTENDANCE_POLL_INTERVAL_MS, 300_000),
    ).toBeLessThanOrEqual(6);
  });

  it("treats daily data as slow-changing", () => {
    expect(DAILY_DATA_STALE_TIME_MS).toBeGreaterThanOrEqual(6 * 60 * 60_000);
  });

  it("isolates access, attendance, and notification caches by organization", () => {
    expect(queryKeys.access.me("org-a")).not.toEqual(queryKeys.access.me("org-b"));
    expect(queryKeys.access.simulate("org-a", "user-1")).not.toEqual(
      queryKeys.access.simulate("org-b", "user-1"),
    );
    expect(
      queryKeys.access.simulationCandidates("org-a", { page: 1, limit: 100 }),
    ).not.toEqual(
      queryKeys.access.simulationCandidates("org-b", { page: 1, limit: 100 }),
    );
    expect(queryKeys.hr.attendanceStatus("org-a")).not.toEqual(
      queryKeys.hr.attendanceStatus("org-b"),
    );
    expect(queryKeys.notifications.unreadCount("org-a")).not.toEqual(
      queryKeys.notifications.unreadCount("org-b"),
    );
  });
});
