import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCalendarHistory } from "./calendar";
import { authenticatedScope, scopedQueryKeyHashFn } from "@/lib/query-scope";

const get = jest.fn();
let session = { orgId: "org-1", user: { id: "user-1" } };

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: session, status: "authenticated" }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    put: jest.fn(),
    post: jest.fn(),
  },
}));

function response(nextCursor: string | null) {
  return {
    events: [],
    failures: [],
    truncated: false,
    coverageState: "complete",
    coverage: [],
    windowStart: "2026-08-02T00:00:00.000Z",
    windowEnd: "2026-10-01T00:00:00.000Z",
    nextCursor,
  };
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  get.mockReset();
  session = { orgId: "org-1", user: { id: "user-1" } };
  get.mockResolvedValueOnce(response("cursor-1")).mockResolvedValueOnce(response("cursor-2"));
});

describe("useCalendarHistory", () => {
  it("loads an anchored first page and follows the opaque cursor", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const { result } = renderHook(
      () => useCalendarHistory("2026-10-01T00:00:00.000Z"),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenNthCalledWith(
      1,
      "/calendar/history",
      { before: "2026-10-01T00:00:00.000Z" },
      expect.any(AbortSignal),
      expect.anything(),
    );

    let nextPageResult: Awaited<ReturnType<typeof result.current.fetchNextPage>> | undefined;
    await act(async () => {
      nextPageResult = await result.current.fetchNextPage();
    });
    expect(get).toHaveBeenNthCalledWith(
      2,
      "/calendar/history",
      { cursor: "cursor-1" },
      expect.any(AbortSignal),
      expect.anything(),
    );
    expect(nextPageResult?.data?.pages).toHaveLength(2);
  });

  it("does not reuse one actor's pages after an identity change (scope-hash isolation)", async () => {
    const user1Client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, queryKeyHashFn: scopedQueryKeyHashFn(authenticatedScope("org-1", "user-1")) } },
    });
    const { result: result1 } = renderHook(
      () => useCalendarHistory("2026-10-01T00:00:00.000Z"),
      { wrapper: wrapper(user1Client) },
    );
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledTimes(1);

    get.mockReset().mockResolvedValue(response("cursor-user-2"));
    session = { orgId: "org-1", user: { id: "user-2" } };
    const user2Client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, queryKeyHashFn: scopedQueryKeyHashFn(authenticatedScope("org-1", "user-2")) } },
    });
    const { result: result2 } = renderHook(
      () => useCalendarHistory("2026-10-01T00:00:00.000Z"),
      { wrapper: wrapper(user2Client) },
    );

    await waitFor(() => {
      expect(get).toHaveBeenCalledTimes(1);
      expect(result2.current.data?.pages[0]?.nextCursor).toBe("cursor-user-2");
    });
  });

  it("stops requesting pages when a capped history slice has no safe continuation", async () => {
    get.mockReset().mockResolvedValue(response(null));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const { result } = renderHook(
      () => useCalendarHistory("2026-10-01T00:00:00.000Z"),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(get).toHaveBeenCalledTimes(1);
  });
});
