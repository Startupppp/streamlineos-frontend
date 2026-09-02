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

function captureEventsOptions(sources: unknown): CapturedOptions {
  mockQuery.mockImplementation((opts: unknown) => {
    const key = (opts as { queryKey: readonly unknown[] }).queryKey;
    if (key[key.length - 1] === "sources") return { data: sources };
    return opts;
  });
  useCalendarEvents(START, END);
  const call = mockQuery.mock.calls
    .map((c) => c[0] as CapturedOptions)
    .find((o) => o.queryKey.includes("events"));
  if (!call) throw new Error("useCalendarEvents did not open a query");
  return call;
}

describe("the calendar events key carries the enabled source set", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("keys on the enabled sources, sorted, once they are known", () => {
    const opts = captureEventsOptions([
      { key: "leave", label: "Leave", module: "hr", enabled: true },
      { key: "birthday", label: "Birthdays", module: "hr", enabled: true },
      { key: "interview", label: "Interviews", module: "hr", enabled: false },
    ]);

    expect(opts.queryKey).toEqual(
      queryKeys.calendar.events(START.toISOString(), END.toISOString(), [
        "birthday",
        "leave",
      ]),
    );
    expect(opts.enabled).toBe(true);
  });

  it("BITE: toggling a source moves the read to a different cache entry", () => {
    const before = captureEventsOptions([
      { key: "leave", label: "Leave", module: "hr", enabled: true },
      { key: "holiday", label: "Holidays", module: "hr", enabled: true },
    ]);
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
    const after = captureEventsOptions([
      { key: "leave", label: "Leave", module: "hr", enabled: true },
      { key: "holiday", label: "Holidays", module: "hr", enabled: false },
    ]);

    expect(after.queryKey).not.toEqual(before.queryKey);
  });

  it("stays a prefix match, so the blanket calendar invalidation still reaches it", () => {
    const opts = captureEventsOptions([
      { key: "leave", label: "Leave", module: "hr", enabled: true },
    ]);

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

  it("BITE: the read is disabled — and the key carries no undefined — until the set is known", () => {
    const opts = captureEventsOptions(undefined);

    expect(opts.enabled).toBe(false);
    expect(opts.queryKey).not.toContain(undefined);
    expect(opts.queryKey).toEqual(
      queryKeys.calendar.events(START.toISOString(), END.toISOString()),
    );
  });

  it("stays gated on the permission regardless of the source set", () => {
    mockCan.mockReturnValue(false);
    const opts = captureEventsOptions([
      { key: "leave", label: "Leave", module: "hr", enabled: true },
    ]);

    expect(opts.enabled).toBe(false);
  });

  it("the sources read itself is permission-gated", () => {
    mockCan.mockReturnValue(false);
    mockQuery.mockImplementation((opts: unknown) => opts);
    const sources = useCalendarSources() as unknown as { enabled: boolean };

    expect(sources.enabled).toBe(false);
  });
});
