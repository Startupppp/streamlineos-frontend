import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
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
jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

const mockQuery = useQuery as jest.Mock;
const mockCan = useCan as jest.Mock;

const START = new Date("2027-03-01T00:00:00.000Z");
const END = new Date("2027-03-31T00:00:00.000Z");

interface CapturedOptions {
  queryKey: readonly unknown[];
  enabled: boolean;
}

function useCaptureEventsOptions(): CapturedOptions {
  useCalendarEvents(START, END);
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
  });

  it("fires as soon as the permission is granted — no source waterfall", () => {
    const opts = useCaptureEventsOptions();

    expect(opts.enabled).toBe(true);
  });

  it("key is the date range only, stable across source changes", () => {
    const opts = useCaptureEventsOptions();

    expect(opts.queryKey).toEqual(
      queryKeys.calendar.events(START.toISOString(), END.toISOString()),
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
        queryKeys.calendar.events(START.toISOString(), END.toISOString()) as QueryKey,
      ),
    ).toBe(true);
  });

  it("BITE: stays disabled when the permission is denied", () => {
    mockCan.mockReturnValue(false);
    const opts = useCaptureEventsOptions();

    expect(opts.enabled).toBe(false);
  });

  it("the sources read itself is permission-gated", () => {
    mockCan.mockReturnValue(false);
    mockQuery.mockImplementation((opts: unknown) => opts);
    const sources = useCalendarSources() as unknown as { enabled: boolean };

    expect(sources.enabled).toBe(false);
  });
});
