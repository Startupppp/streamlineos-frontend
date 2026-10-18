import { useQuery } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { useCan, usePermissionGate } from "@/hooks/api/access";
import { queryKeys } from "@/lib/query-keys";
import { partialMatchKey } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCalendarEvents, useCalendarMemberLookup, useCalendarSources } from "./calendar";
import { useCalendarEvent, useEventAttendees, useEventSyncStatus } from "./calendar-event-detail";

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useMutation: jest.fn(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn(), usePermissionGate: jest.fn() }));
jest.mock("@/hooks/api/calendar-offline-policy", () => ({ useCalendarOfflinePolicy: () => ({ data: null }) }));
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

const mockQuery = useQuery as jest.Mock;
const mockCan = useCan as jest.Mock;
const mockGate = usePermissionGate as jest.Mock;

const START = new Date("2027-03-01T00:00:00.000Z");
const END = new Date("2027-03-31T00:00:00.000Z");

interface CapturedOptions {
  queryKey: readonly unknown[];
  enabled: boolean;
}

function useCaptureEventsOptions(): CapturedOptions {
  renderHook(function useCalendarEventsProbe() {
    return useCalendarEvents(START, END);
  });
  const call = mockQuery.mock.calls
    .map((c) => c[0] as CapturedOptions)
    .find((o) => o.queryKey.includes("events"));
  if (!call) throw new Error("useCalendarEvents did not open a query");
  return call;
}

describe("the calendar events key fires immediately on permission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
    mockGate.mockReturnValue({ allowed: true, pending: false, unavailable: false });
  });

  it("fires as soon as the permission is granted — no source waterfall", () => {
    const opts = useCaptureEventsOptions();

    expect(opts.enabled).toBe(true);
  });

  it("key binds the organization, actor, and date range", () => {
    const opts = useCaptureEventsOptions();

    expect(opts.queryKey).toEqual(
      queryKeys.calendar.events(
        "org-1",
        "user-1",
        START.toISOString(),
        END.toISOString(),
        undefined,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ),
    );
    expect(opts.queryKey).not.toContain(undefined);
  });

  it("stays a prefix match so the blanket calendar invalidation reaches it", () => {
    const opts = useCaptureEventsOptions();

    expect(
      partialMatchKey(opts.queryKey as QueryKey, queryKeys.calendar.all as QueryKey),
    ).toBe(true);
    expect(
      partialMatchKey(
        opts.queryKey as QueryKey,
        queryKeys.calendar.events(
          "org-1",
          "user-1",
          START.toISOString(),
          END.toISOString(),
        ) as QueryKey,
      ),
    ).toBe(true);
  });

  it("BITE: stays disabled when the permission is denied", () => {
    mockCan.mockReturnValue(false);
    mockGate.mockReturnValue({ allowed: false, pending: false, unavailable: false });
    const opts = useCaptureEventsOptions();

    expect(opts.enabled).toBe(false);
  });

  it("the sources read itself is permission-gated", () => {
    mockCan.mockReturnValue(false);
    mockQuery.mockImplementation((opts: unknown) => opts);
    renderHook(() => useCalendarSources());
    const sources = mockQuery.mock.calls.at(-1)?.[0] as { enabled: boolean };

    expect(sources.enabled).toBe(false);
  });
});

describe("CAL-B-026 the events read carries the title search and source filter to the server", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
    mockGate.mockReturnValue({ allowed: true, pending: false, unavailable: false });
    mockQuery.mockImplementation((opts: unknown) => opts);
  });

  function captureFiltered(filter?: { q?: string; sourceKey?: string }) {
    renderHook(function useFilteredEventsProbe() {
      return useCalendarEvents(START, END, true, filter);
    });
    const call = mockQuery.mock.calls
      .map((c) => c[0] as CapturedOptions & { queryFn: (ctx: { signal: AbortSignal }) => Promise<unknown> })
      .find((o) => o.queryKey.includes("events"));
    if (!call) throw new Error("useCalendarEvents did not open a query");
    return call;
  }

  it("sends q and sourceKey and keys the window by the filter", async () => {
    const opts = captureFiltered({ q: "QA1015R3", sourceKey: "calendar-events" });
    await opts.queryFn({ signal: new AbortController().signal });

    const params = (apiClient.get as jest.Mock).mock.calls[0]?.[1];
    expect(params).toMatchObject({ q: "QA1015R3", sourceKey: "calendar-events" });
    expect(opts.queryKey).toContainEqual({ q: "QA1015R3", sourceKey: "calendar-events" });
    expect(partialMatchKey(opts.queryKey as QueryKey, queryKeys.calendar.eventsAll as QueryKey)).toBe(true);
  });

  it("sends neither param when no filter is set", async () => {
    const opts = captureFiltered();
    await opts.queryFn({ signal: new AbortController().signal });

    const params = (apiClient.get as jest.Mock).mock.calls[0]?.[1];
    expect(params).not.toHaveProperty("q");
    expect(params).not.toHaveProperty("sourceKey");
    expect(params).toHaveProperty("start", START.toISOString());
  });
});

describe("CAL-B-016 a failed calendar read stays inside its own panel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
    mockGate.mockReturnValue({ allowed: true, pending: false, unavailable: false });
    mockQuery.mockImplementation((opts: unknown) => opts);
  });

  it.each([
    ["events", () => useCalendarEvents(START, END)],
    ["sources", () => useCalendarSources()],
    ["member lookup", () => useCalendarMemberLookup()],
    ["event detail", () => useCalendarEvent(7)],
    ["attendees", () => useEventAttendees(7)],
    ["sync status", () => useEventSyncStatus(7)],
  ])("%s never throws its error to the page boundary", (_name, hook) => {
    renderHook(hook);
    const options = mockQuery.mock.calls.at(-1)?.[0] as { throwOnError?: unknown; queryKey: unknown };
    expect(options.queryKey).toBeDefined();
    expect(options.throwOnError).toBe(false);
  });
});
