import { createAppQueryClient } from "@/components/providers/query-provider";
import {
  ACTIVE_ATTENDANCE_POLL_INTERVAL_MS,
  DAILY_DATA_STALE_TIME_MS,
  NOTIFICATION_FALLBACK_INTERVAL_MS,
  requestBudgetForWindow,
} from "./query-request-policies";
import { queryKeys } from "./query-keys";

describe("query request policies", () => {
  it("hashes identical logical keys into separate tenant and actor scopes", () => {
    const first = createAppQueryClient("authenticated:org-a:user-a");
    const second = createAppQueryClient("authenticated:org-b:user-a");
    const key = ["streamlineos", "hr", "employees"] as const;

    first.setQueryData(key, "a");
    second.setQueryData(key, "b");

    expect(first.getQueryCache().getAll()[0]?.queryHash).not.toBe(
      second.getQueryCache().getAll()[0]?.queryHash,
    );
  });

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

  it.each([
    ["access.me", () => queryKeys.access.me()],
    ["access.simulate", () => queryKeys.access.simulate("user-1")],
    [
      "access.simulationCandidates",
      () => queryKeys.access.simulationCandidates({ limit: 100 }),
    ],
    ["hr.attendanceStatus", () => queryKeys.hr.attendanceStatus()],
    ["notifications.unreadCount", () => queryKeys.notifications.unreadCount()],
  ])("isolates %s between two organizations", (_name, makeKey) => {
    const orgA = createAppQueryClient("authenticated:org-a:user-1");
    const orgB = createAppQueryClient("authenticated:org-b:user-1");

    orgA.setQueryData(makeKey(), "org-a rows");

    expect(orgB.getQueryData(makeKey())).toBeUndefined();
    expect(orgA.getQueryCache().getAll()[0]?.queryHash).not.toBe(
      orgB.getQueryCache().getAll()[0]?.queryHash,
    );
  });

  it("isolates access.me between two people in one organization", () => {
    const first = createAppQueryClient("authenticated:org-a:user-1");
    const second = createAppQueryClient("authenticated:org-a:user-2");

    first.setQueryData(queryKeys.access.me(), "user-1 permissions");

    expect(second.getQueryData(queryKeys.access.me())).toBeUndefined();
  });
});
