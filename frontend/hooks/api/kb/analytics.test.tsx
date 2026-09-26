import { renderHook, waitFor } from "@testing-library/react";
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
} from "./analytics";

const PAGINATION = { limit: 50, hasMore: false, nextCursor: null };

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
  lastSeenAt: "2026-09-25T00:00:00.000Z",
  assigneeId: null,
  assigneeName: null,
  status: "open",
};

const GAP_RELATED_PAGE_ROW = {
  id: 10,
  title: "Password reset guide",
  slug: "password-reset",
  spaceId: 2,
  score: 0.85,
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
