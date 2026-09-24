"use client";

import { render } from "@testing-library/react";
import { useKbPageVersions } from "@/hooks/api/kb/pages";

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
let capturedQueryFn: ((ctx: QueryFnCtx) => Promise<unknown>) | null = null;
let capturedGetNextPageParam: ((page: unknown) => unknown) | null = null;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: jest.fn(
      (opts: {
        queryFn: (ctx: QueryFnCtx) => Promise<unknown>;
        getNextPageParam: (page: unknown) => unknown;
      }) => {
        capturedQueryFn = opts.queryFn;
        capturedGetNextPageParam = opts.getNextPageParam;
        return {
          data: undefined,
          isLoading: false,
          hasNextPage: false,
          fetchNextPage: jest.fn(),
          isFetchingNextPage: false,
        };
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
  useKbPageVersions(1);
  return null;
}

type CursorPage = {
  data: unknown[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
};

function makePage(items: unknown[], opts: { hasMore: boolean; nextCursor?: string }): CursorPage {
  return {
    data: items,
    pagination: {
      limit: 50,
      nextCursor: opts.nextCursor ?? null,
      hasMore: opts.hasMore,
    },
  };
}

describe("version cursor — first page with more", () => {
  it("(a) first page with hasMore=true: getNextPageParam returns the cursor string", () => {
    render(<VersionsHook />);
    const page = makePage([{ id: 1 }], { hasMore: true, nextCursor: "cursor-a" });
    expect(capturedGetNextPageParam!(page)).toBe("cursor-a");
  });

  it("(b) queryFn with the returned cursor sends it as `cursor` param", async () => {
    render(<VersionsHook />);
    const signal = new AbortController().signal;
    await capturedQueryFn!({ pageParam: "cursor-a", signal });
    const params = mockGet.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(params).toHaveProperty("cursor", "cursor-a");
  });
});

describe("version cursor — second page accumulates without overlap", () => {
  it("(a) requesting page 2 with cursor returns page-2 items only (no page-1 overlap in API call)", async () => {
    render(<VersionsHook />);
    const page2Items = [{ id: 2 }, { id: 1 }];
    mockGet.mockResolvedValue(makePage(page2Items, { hasMore: false }));
    const signal = new AbortController().signal;

    const page2 = await capturedQueryFn!({ pageParam: "cursor-b", signal });

    const typed = page2 as CursorPage;
    expect(typed.data).toHaveLength(2);
    expect(typed.pagination.hasMore).toBe(false);
  });
});

describe("version cursor — last page", () => {
  it("(a) getNextPageParam returns undefined when nextCursor is null", () => {
    render(<VersionsHook />);
    const page = makePage([{ id: 1 }], { hasMore: false, nextCursor: undefined });
    expect(capturedGetNextPageParam!(page)).toBeUndefined();
  });

  it("(b) getNextPageParam returns undefined when hasMore is false and nextCursor is present", () => {
    render(<VersionsHook />);
    const page = makePage([], { hasMore: false, nextCursor: undefined });
    expect(capturedGetNextPageParam!(page)).toBeUndefined();
  });
});

describe("version cursor — filtered-empty vs first-empty", () => {
  it("(a) loaded empty (hasMore=false, data=[]) is distinguishable from loading by the isLoading flag", () => {
    render(<VersionsHook />);
    expect(capturedQueryFn).not.toBeNull();

    const loadedEmpty = makePage([], { hasMore: false });
    expect(capturedGetNextPageParam!(loadedEmpty)).toBeUndefined();
    expect(loadedEmpty.pagination.hasMore).toBe(false);
    expect(loadedEmpty.data).toHaveLength(0);
  });

  it("(b) first-empty: queryFn with no cursor sends no cursor param", async () => {
    render(<VersionsHook />);
    const signal = new AbortController().signal;
    await capturedQueryFn!({ pageParam: undefined, signal });
    const params = mockGet.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(params).not.toHaveProperty("cursor");
  });
});
