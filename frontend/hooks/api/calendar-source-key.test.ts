import { useQuery } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { useCan, usePermissionGate } from "@/hooks/api/access";
import { queryKeys } from "@/lib/query-keys";
import { partialMatchKey } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { useCalendarEvents, useCalendarSources } from "./calendar";

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
