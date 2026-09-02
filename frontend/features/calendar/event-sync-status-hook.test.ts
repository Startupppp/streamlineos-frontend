import { render } from "@testing-library/react";
import { createElement } from "react";
import { useEventSyncStatus } from "@/hooks/api/calendar";

type QueryLike = { state: { data: { status: string } | undefined } };
type RefetchIntervalFn = (query: QueryLike) => number | false | undefined;
type UseQueryOpts = {
  queryKey?: unknown[];
  enabled?: boolean;
  refetchInterval?: RefetchIntervalFn | number | false;
};

let capturedEnabled: boolean | undefined;
let capturedRefetchInterval: RefetchIntervalFn | undefined;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn((opts: UseQueryOpts) => {
      const key = opts.queryKey;
      if (Array.isArray(key) && key.includes("sync-status")) {
        capturedEnabled = opts.enabled;
        if (typeof opts.refetchInterval === "function") {
          capturedRefetchInterval = opts.refetchInterval as RefetchIntervalFn;
        }
      }
      return { data: undefined, isError: false, error: null };
    }),
    useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
    useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  };
});

function SyncStatusHook({ eventId }: { eventId: number | null }) {
  useEventSyncStatus(eventId);
  return null;
}

beforeEach(() => {
  capturedEnabled = undefined;
  capturedRefetchInterval = undefined;
});

describe("useEventSyncStatus — enabled gate", () => {
  it("is disabled when eventId is null", () => {
    render(createElement(SyncStatusHook, { eventId: null }));
    expect(capturedEnabled).toBe(false);
  });

  it("is enabled when eventId is a number", () => {
    render(createElement(SyncStatusHook, { eventId: 7 }));
    expect(capturedEnabled).toBe(true);
  });
});

describe("useEventSyncStatus — refetchInterval polling", () => {
  it("refetchInterval returns false for synced (polling stops)", () => {
    render(createElement(SyncStatusHook, { eventId: 1 }));
    const result = capturedRefetchInterval?.({
      state: { data: { status: "synced" } },
    });
    expect(result).toBe(false);
  });

  it("refetchInterval returns false for failed (polling stops)", () => {
    render(createElement(SyncStatusHook, { eventId: 1 }));
    const result = capturedRefetchInterval?.({
      state: { data: { status: "failed" } },
    });
    expect(result).toBe(false);
  });

  it("refetchInterval returns false for not_synced (polling stops)", () => {
    render(createElement(SyncStatusHook, { eventId: 1 }));
    const result = capturedRefetchInterval?.({
      state: { data: { status: "not_synced" } },
    });
    expect(result).toBe(false);
  });

  it("refetchInterval returns a positive interval for pending", () => {
    render(createElement(SyncStatusHook, { eventId: 1 }));
    const result = capturedRefetchInterval?.({
      state: { data: { status: "pending" } },
    });
    expect(typeof result).toBe("number");
    expect(result as number).toBeGreaterThan(0);
  });

  it("refetchInterval returns a positive interval for in_flight", () => {
    render(createElement(SyncStatusHook, { eventId: 1 }));
    const result = capturedRefetchInterval?.({
      state: { data: { status: "in_flight" } },
    });
    expect(typeof result).toBe("number");
    expect(result as number).toBeGreaterThan(0);
  });

  it("refetchInterval returns false when data is undefined (no data yet)", () => {
    render(createElement(SyncStatusHook, { eventId: 1 }));
    const result = capturedRefetchInterval?.({ state: { data: undefined } });
    expect(result).toBe(false);
  });
});
