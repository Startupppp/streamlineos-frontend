"use client";

import { render } from "@testing-library/react";
import { useKbPageVersions } from "./pages";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

const mockGet = jest.fn<Promise<unknown>, unknown[]>(() =>
  Promise.resolve({ data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } }),
);
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

type QueryFnCtx = { pageParam: unknown; signal: AbortSignal };
let capturedQueryFn: ((ctx: QueryFnCtx) => unknown) | null = null;
let capturedGetNextPageParam: ((page: unknown) => unknown) | null = null;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: jest.fn(
      (opts: {
        queryFn: (ctx: QueryFnCtx) => unknown;
        getNextPageParam: (page: unknown) => unknown;
      }) => {
        capturedQueryFn = opts.queryFn;
        capturedGetNextPageParam = opts.getNextPageParam;
        return { data: undefined, isLoading: false, hasNextPage: false, fetchNextPage: jest.fn(), isFetchingNextPage: false };
      },
    ),
  };
});

beforeEach(() => {
  capturedQueryFn = null;
  capturedGetNextPageParam = null;
  mockGet.mockClear();
  mockGet.mockResolvedValue({
    data: [],
    pagination: { limit: 50, nextCursor: null, hasMore: false },
  });
});

function VersionsHook() {
  useKbPageVersions(42);
  return null;
}

describe("useKbPageVersions — signal forwarded to apiClient.get", () => {
  it("passes signal as the third argument, not in params", async () => {
    render(<VersionsHook />);
    expect(capturedQueryFn).not.toBeNull();
    const signal = new AbortController().signal;
    await capturedQueryFn!({ pageParam: undefined, signal });
    expect(mockGet).toHaveBeenCalledWith(
      "/kb/pages/42/versions",
      expect.any(Object),
      signal,
      expect.any(Function),
    );
    const callArgs = mockGet.mock.calls[0];
    expect(callArgs[1]).not.toHaveProperty("signal");
  });
});

describe("useKbPageVersions — cursor forwarding", () => {
  it("omits cursor param when pageParam is undefined", async () => {
    render(<VersionsHook />);
    expect(capturedQueryFn).not.toBeNull();
    const signal = new AbortController().signal;
    await capturedQueryFn!({ pageParam: undefined, signal });
    const params = mockGet.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(params).not.toHaveProperty("cursor");
  });

  it("includes cursor param when pageParam is set", async () => {
    render(<VersionsHook />);
    expect(capturedQueryFn).not.toBeNull();
    const signal = new AbortController().signal;
    const cursor = "abc123";
    await capturedQueryFn!({ pageParam: cursor, signal });
    const params = mockGet.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(params).toHaveProperty("cursor", cursor);
  });
});

describe("useKbPageVersions — getNextPageParam", () => {
  it("returns the nextCursor from pagination when hasMore is true", () => {
    render(<VersionsHook />);
    expect(capturedGetNextPageParam).not.toBeNull();
    const page = { data: [], pagination: { limit: 50, nextCursor: "xyz", hasMore: true } };
    expect(capturedGetNextPageParam!(page)).toBe("xyz");
  });

  it("returns undefined when nextCursor is null (last page)", () => {
    render(<VersionsHook />);
    expect(capturedGetNextPageParam).not.toBeNull();
    const page = { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } };
    expect(capturedGetNextPageParam!(page)).toBeUndefined();
  });
});

describe("useKbPageVersions — flattened pages", () => {
  it("data pages are structured as CursorPage with data and pagination", async () => {
    render(<VersionsHook />);
    expect(capturedQueryFn).not.toBeNull();
    const signal = new AbortController().signal;
    const page = await capturedQueryFn!({ pageParam: undefined, signal });
    expect(page).toHaveProperty("data");
    expect(page).toHaveProperty("pagination");
    const typed = page as { data: unknown[]; pagination: { nextCursor: string | null } };
    expect(Array.isArray(typed.data)).toBe(true);
    expect("nextCursor" in typed.pagination).toBe(true);
  });
});
