import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { portalApiClient, getPortalToken } from "@/lib/portal-api-client";
import {
  usePortalProjectFiles,
  usePortalProjectRequests,
  usePortalProjectUpdates,
} from "./use-portal-project-children";

jest.mock("@/lib/portal-api-client", () => ({
  portalApiClient: { get: jest.fn() },
  getPortalToken: jest.fn(),
}));

const get = jest.mocked(portalApiClient.get);
const token = jest.mocked(getPortalToken);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function updatePage(ids: number[], nextCursor: string | null) {
  return {
    data: ids.map((id) => ({
      id,
      body: `update ${id}`,
      authorName: "Alice",
      createdAt: "2026-05-01T09:00:00.000Z",
    })),
    pagination: { limit: 25, hasMore: nextCursor !== null, nextCursor },
  };
}

beforeEach(() => {
  get.mockReset();
  token.mockReturnValue("portal-token");
});

describe("portal child collections page by cursor", () => {
  it("asks for the cursor the first page returned and appends the second page without repeating a row", async () => {
    get
      .mockResolvedValueOnce(updatePage([31, 22], "cursor-after-22"))
      .mockResolvedValueOnce(updatePage([13], null));

    const { result } = renderHook(() => usePortalProjectUpdates(10), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(get).toHaveBeenNthCalledWith(1, "/portal/v1/projects/10/updates", { limit: 25 });
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(get).toHaveBeenNthCalledWith(2, "/portal/v1/projects/10/updates", {
      limit: 25,
      cursor: "cursor-after-22",
    });
    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.items.map((row) => row.id)).toEqual([31, 22, 13]);
    expect(new Set(result.current.items.map((row) => row.id)).size).toBe(3);
    expect(result.current.hasMore).toBe(false);
  });

  it("stops at the last page, so the reader is never offered a page that does not exist", async () => {
    get.mockResolvedValue(updatePage([31], null));

    const { result } = renderHook(() => usePortalProjectUpdates(10), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    expect(result.current.hasMore).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("reads files and requests from their own endpoints rather than the project overview", async () => {
    get.mockResolvedValue({
      data: [],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });

    const files = renderHook(() => usePortalProjectFiles(4), { wrapper });
    await waitFor(() => expect(files.result.current.isLoading).toBe(false));
    const requests = renderHook(() => usePortalProjectRequests(4), { wrapper });
    await waitFor(() => expect(requests.result.current.isLoading).toBe(false));

    const paths = get.mock.calls.map((call) => call[0]);
    expect(paths).toContain("/portal/v1/projects/4/files");
    expect(paths).toContain("/portal/v1/projects/4/requests");
    expect(paths.some((path) => path.endsWith("/overview"))).toBe(false);
  });

  it("reads nothing without a portal session, so an unauthenticated tab never requests a client's collection", async () => {
    token.mockReturnValue(null);

    renderHook(() => usePortalProjectUpdates(10), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });

    expect(get).not.toHaveBeenCalled();
  });

  it("rejects a page whose rows do not match the contract, so a drifted field cannot render as empty", async () => {
    get.mockResolvedValue({
      data: [{ id: 31, body: "update", authorName: "Alice" }],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });

    const { result } = renderHook(() => usePortalProjectUpdates(10), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.items).toEqual([]);
  });
});
