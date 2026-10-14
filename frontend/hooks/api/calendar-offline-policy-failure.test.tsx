import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCalendarEvents } from "./calendar";

const get = jest.fn();
const clear = jest.fn().mockResolvedValue(undefined);
const save = jest.fn().mockResolvedValue(undefined);
let policy = { data: { enabled: true, maxAgeDays: 7, version: 1 }, isError: true };

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } }, status: "authenticated" }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  usePermissionGate: () => ({ allowed: true, pending: false, unavailable: false }),
}));

jest.mock("./calendar-offline-policy", () => ({
  useCalendarOfflinePolicy: () => policy,
}));

jest.mock("@/lib/offline/calendar-offline-cache", () => ({
  allowOfflineCalendarPolicy: jest.fn().mockReturnValue(true),
  clearOfflineCalendarSnapshot: (...args: unknown[]) => clear(...args),
  revokeOfflineCalendarPolicy: jest.fn(),
  saveOfflineCalendarSnapshot: (...args: unknown[]) => save(...args),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

it("clears an offline snapshot and does not save stale enabled policy data after an online policy error", async () => {
  policy = { data: { enabled: true, maxAgeDays: 7, version: 1 }, isError: true };
  clear.mockClear();
  save.mockClear();
  get.mockReset().mockResolvedValue({ events: [], failures: [], truncated: false, coverageState: "complete", coverage: [] });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  localStorage.setItem("streamline-calendar-offline-identity", "org-1:user-1");
  sessionStorage.setItem("streamline-calendar-offline-session-identity", "org-1:user-1");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  renderHook(
    () => useCalendarEvents(new Date("2026-10-14T00:00:00.000Z"), new Date("2026-10-15T00:00:00.000Z")),
    { wrapper },
  );

  await waitFor(() => expect(get).toHaveBeenCalled());
  expect(get).toHaveBeenCalledWith(
    "/calendar/events",
    expect.objectContaining({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    expect.anything(),
    expect.anything(),
  );
  await waitFor(() => expect(clear).toHaveBeenCalled());
  expect(localStorage.getItem("streamline-calendar-offline-identity")).toBeNull();
  expect(sessionStorage.getItem("streamline-calendar-offline-session-identity")).toBeNull();
  expect(save).not.toHaveBeenCalled();
});

it("keeps the existing offline snapshot during a network outage", async () => {
  policy = { data: { enabled: true, maxAgeDays: 7, version: 1 }, isError: true };
  clear.mockClear();
  save.mockClear();
  get.mockReset().mockResolvedValue({ events: [], failures: [], truncated: false, coverageState: "complete", coverage: [] });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  renderHook(
    () => useCalendarEvents(new Date("2026-10-14T00:00:00.000Z"), new Date("2026-10-15T00:00:00.000Z")),
    { wrapper },
  );

  await waitFor(() => expect(get).toHaveBeenCalled());
  expect(clear).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});
