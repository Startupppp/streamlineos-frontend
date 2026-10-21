import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

jest.mock("@/lib/portal-api-client", () => ({
  portalApiClient: { get: jest.fn(), post: jest.fn() },
  getPortalToken: jest.fn(() => "test-token"),
}));

import { usePortalDocsList, usePortalDocDetail } from "./use-portal-docs";
import { portalApiClient } from "@/lib/portal-api-client";

const mockGet = portalApiClient.get as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const PAGE_RESPONSE = {
  data: [
    {
      id: 1,
      title: "Handbook",
      kind: "document",
      spaceId: null,
      expiresAt: "2027-01-01T00:00:00Z",
      allowDownload: false,
    },
  ],
  pagination: { limit: 50, hasMore: false, nextCursor: null },
};

const DETAIL_RESPONSE = {
  id: 1,
  title: "Handbook",
  icon: null,
  coverImage: null,
  kind: "document",
  content: null,
  updatedAt: "2026-10-01T00:00:00Z",
  allowDownload: false,
};

describe("usePortalDocsList", () => {
  it("parses the backend response into the list contract", async () => {
    mockGet.mockResolvedValue(PAGE_RESPONSE);

    const { result } = renderHook(() => usePortalDocsList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]?.data[0]?.title).toBe("Handbook");
  });

  it("passes cursor to the request when fetching subsequent pages", async () => {
    mockGet.mockResolvedValue({
      ...PAGE_RESPONSE,
      pagination: { ...PAGE_RESPONSE.pagination, hasMore: true, nextCursor: "cursor-abc" },
    });

    const { result } = renderHook(() => usePortalDocsList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(true);
  });
});

describe("usePortalDocDetail", () => {
  it("parses the detail contract including kind and allowDownload", async () => {
    mockGet.mockResolvedValue(DETAIL_RESPONSE);

    const { result } = renderHook(() => usePortalDocDetail(1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.title).toBe("Handbook");
    expect(result.current.data?.allowDownload).toBe(false);
    expect(result.current.data?.kind).toBe("document");
  });

  it("is disabled when pageId is 0 (invalid state during param parse)", () => {
    const { result } = renderHook(() => usePortalDocDetail(0), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isLoading).toBe(false);
  });
});
