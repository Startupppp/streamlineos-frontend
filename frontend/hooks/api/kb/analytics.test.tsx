import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockGet = jest.fn<Promise<unknown>, [string, unknown, unknown, unknown]>();
const mockUseCan = jest.fn<boolean, [string]>();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (path: string, params: unknown, signal: unknown, contract: unknown) =>
      mockGet(path, params, signal, contract),
    post: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

import {
  usePageAnalytics,
  useKnowledgeGaps,
  useGapRelatedPages,
  useKbContentGaps,
  useKbNoResults,
} from "./analytics";
import {
  kbAnalyticsGapRelatedPagesContract,
  kbAnalyticsGapsContract,
  kbAnalyticsContentGapsContract,
  kbAnalyticsNoResultsContract,
} from "./kb-analytics-schema";

const PAGINATION = { limit: 50, hasMore: false, nextCursor: null };

describe("kbAnalyticsGapsContract", () => {
  it("rejects a bare array that has no continuation or scope-completeness signal", () => {
    const parsed = kbAnalyticsGapsContract.safeParse([
      {
        query: "reset password",
        count: 3,
        lastOccurredAt: "2026-09-25T00:00:00.000Z",
      },
    ]);

    expect(parsed.success).toBe(false);
  });

  it("the GAP_ROW test fixture matches the wire shape the backend sends", () => {
    const result = kbAnalyticsGapsContract.safeParse({
      data: [GAP_ROW],
      pagination: PAGINATION,
      scopeComplete: true,
    });
    expect(result.success).toBe(true);
  });
});

const PAGE_ANALYTICS_ROW = {
  id: 1,
  title: "Getting started",
  status: "published",
  trustState: "verified",
  updatedAt: "2026-09-25T00:00:00.000Z",
  uniqueViewers: 42,
  commentCount: 3,
  versionCount: 7,
};

const GAP_ROW = {
  query: "how to reset password",
  count: 15,
  lastOccurredAt: "2026-09-25T00:00:00.000Z",
};

const GAP_RELATED_PAGE_ROW = {
  id: 10,
  title: "Password reset guide",
  status: "published",
  updatedAt: "2026-09-25T00:00:00.000Z",
};

const CONTENT_GAP_ROW = {
  query: "billing",
  count: 4,
  lastOccurredAt: "2026-09-25T00:00:00.000Z",
  gapKind: "search",
};

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("useKbContentGaps", () => {
  it("keeps the paged wire contract, server kind filter, and continuation cursor", async () => {
    expect(kbAnalyticsContentGapsContract.safeParse({
      data: [CONTENT_GAP_ROW],
      pagination: { limit: 1, hasMore: true, nextCursor: "next" },
    }).success).toBe(true);
    mockGet
      .mockResolvedValueOnce({
        data: [CONTENT_GAP_ROW],
        pagination: { limit: 1, hasMore: true, nextCursor: "next" },
      })
      .mockResolvedValueOnce({
        data: [{ ...CONTENT_GAP_ROW, query: "shipping" }],
        pagination: { limit: 1, hasMore: false, nextCursor: null },
      });

    const { result } = renderHook(() => useKbContentGaps(undefined, "search"), { wrapper });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(result.current.data).toEqual([CONTENT_GAP_ROW]);
    expect(mockGet.mock.calls[0]?.[1]).toMatchObject({ kind: "search" });
    await act(async () => { await result.current.fetchNextPage(); });
    expect(mockGet.mock.calls[1]?.[1]).toMatchObject({ kind: "search", cursor: "next" });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe("useKbNoResults", () => {
  it("keeps a first-read failure inline for the Analytics page retry state", async () => {
    client.setDefaultOptions({ queries: { retry: false, throwOnError: true } });
    mockGet.mockRejectedValueOnce(new Error("No-results unavailable"));

    const { result } = renderHook(() => useKbNoResults(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error("No-results unavailable"));
  });

  it("flattens pages while preserving scope coverage and the next cursor", async () => {
    const row = { query: "billing", count: 4 };
    expect(kbAnalyticsNoResultsContract.safeParse({
      data: [row],
      pagination: { limit: 1, hasMore: true, nextCursor: "next" },
      scopeComplete: true,
    }).success).toBe(true);
    mockGet
      .mockResolvedValueOnce({
        data: [row],
        pagination: { limit: 1, hasMore: true, nextCursor: "next" },
        scopeComplete: true,
      })
      .mockResolvedValueOnce({
        data: [{ query: "shipping", count: 3 }],
        pagination: { limit: 1, hasMore: false, nextCursor: null },
        scopeComplete: true,
      });

    const { result } = renderHook(() => useKbNoResults({ spaceId: 7 }), { wrapper });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(result.current.data?.scopeComplete).toBe(true);
    expect(mockGet.mock.calls[0]?.[1]).toMatchObject({ spaceId: 7 });
    await act(async () => { await result.current.fetchNextPage(); });
    expect(mockGet.mock.calls[1]?.[1]).toMatchObject({ spaceId: 7, cursor: "next" });
    await waitFor(() => expect(result.current.data?.data).toHaveLength(2));
  });
});

describe("usePageAnalytics — wire-shape is visible through selectFlatPages", () => {
  it("returns the flat rows array when the wire sends { data: [], pagination }", async () => {
    mockGet.mockResolvedValue({ data: [PAGE_ANALYTICS_ROW], pagination: PAGINATION });

    const { result } = renderHook(() => usePageAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([PAGE_ANALYTICS_ROW]);
  });

  it("when the wire renames data to items the result is not the rows list — so a wire-shape change breaks the test above", async () => {
    mockGet.mockResolvedValue({ items: [PAGE_ANALYTICS_ROW], pagination: PAGINATION });

    const { result } = renderHook(() => usePageAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).not.toEqual([PAGE_ANALYTICS_ROW]);
  });

  it("data is undefined when the user lacks analytics permission, so a disabled query is distinguishable from empty results", () => {
    mockUseCan.mockReturnValue(false);
    mockGet.mockResolvedValue({ data: [PAGE_ANALYTICS_ROW], pagination: PAGINATION });

    const { result } = renderHook(() => usePageAnalytics(), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("fetches from /kb/analytics/pages", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: PAGINATION });

    renderHook(() => usePageAnalytics(), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0]?.[0]).toBe("/kb/analytics/pages");
  });
});

describe("useKnowledgeGaps — wire-shape is visible through selectFlatPages, gaps alias preserved", () => {
  it("exposes flat rows under the gaps property when the wire sends { data: [], pagination }", async () => {
    mockGet.mockResolvedValue({ data: [GAP_ROW], pagination: PAGINATION });

    const { result } = renderHook(() => useKnowledgeGaps(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.gaps).toEqual([GAP_ROW]);
  });

  it("when the wire renames data to items the gaps property is not the rows list — so a wire-shape change breaks the test above", async () => {
    mockGet.mockResolvedValue({ items: [GAP_ROW], pagination: PAGINATION });

    const { result } = renderHook(() => useKnowledgeGaps(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.gaps).not.toEqual([GAP_ROW]);
  });

  it("gaps is undefined when the user lacks analytics permission", () => {
    mockUseCan.mockReturnValue(false);

    const { result } = renderHook(() => useKnowledgeGaps(), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.gaps).toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("fetches from /kb/analytics/gaps", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: PAGINATION });

    renderHook(() => useKnowledgeGaps(), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0]?.[0]).toBe("/kb/analytics/gaps");
  });
});

describe("useGapRelatedPages — wire-shape is visible through selectFlatPages, pages alias preserved", () => {
  it("the GAP_RELATED_PAGE_ROW fixture matches the wire shape the backend sends, which declares status and updatedAt rather than slug, spaceId and score", () => {
    const result = kbAnalyticsGapRelatedPagesContract.safeParse({
      data: [GAP_RELATED_PAGE_ROW],
      pagination: PAGINATION,
    });
    expect(result.success).toBe(true);
  });

  it("exposes flat rows under the pages property when the wire sends { data: [], pagination }", async () => {
    mockGet.mockResolvedValue({ data: [GAP_RELATED_PAGE_ROW], pagination: PAGINATION });

    const { result } = renderHook(
      () => useGapRelatedPages("how to reset password"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.pages).toEqual([GAP_RELATED_PAGE_ROW]);
  });

  it("when the wire renames data to items the pages property is not the rows list — so a wire-shape change breaks the test above", async () => {
    mockGet.mockResolvedValue({ items: [GAP_RELATED_PAGE_ROW], pagination: PAGINATION });

    const { result } = renderHook(
      () => useGapRelatedPages("how to reset password"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.pages).not.toEqual([GAP_RELATED_PAGE_ROW]);
  });

  it("does not fetch when the search query is undefined, since a blank search returns nothing useful", () => {
    const { result } = renderHook(() => useGapRelatedPages(undefined), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("does not fetch when the search query is an empty string", () => {
    const { result } = renderHook(() => useGapRelatedPages(""), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("fetches from /kb/analytics/gaps/related-pages", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: PAGINATION });

    renderHook(() => useGapRelatedPages("password"), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0]?.[0]).toBe("/kb/analytics/gaps/related-pages");
  });
});
