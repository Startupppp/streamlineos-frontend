import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { useLinkGoalCandidates } from "./use-infinite-selector";

const mockGet = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

function makeWrapper() {
  const client = createAppQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, wrapper: Wrapper };
}

const GOAL_PAGE = {
  items: [{ id: 1, title: "Grow NPS", status: "on_track", level: "company", progress: 0 }],
  page: 1,
  pageSize: 20,
  total: 1,
  nextCursor: null,
  hasMore: false,
};

beforeEach(() => mockGet.mockReset());

describe("useLinkGoalCandidates — cursor-based pagination (BSN-LINK-GOAL-CURSOR)", () => {
  it("sends cursor in the request when the backend returns a nextCursor so the second page loads correctly", async () => {
    const firstPage = { ...GOAL_PAGE, nextCursor: "cursor-abc", hasMore: true };
    const secondPage = { ...GOAL_PAGE, nextCursor: null, hasMore: false };
    mockGet
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useLinkGoalCandidates({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await result.current.fetchNextPage();

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

    const [, secondParams] = mockGet.mock.calls[1] as [string, Record<string, string>];
    expect(secondParams.cursor).toBe("cursor-abc");
  });

  it("does not send a page param in any request so offset pagination is never used", async () => {
    mockGet.mockResolvedValue(GOAL_PAGE);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useLinkGoalCandidates({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, params] = mockGet.mock.calls[0] as [string, Record<string, string>];
    expect(params).not.toHaveProperty("page");
  });

  it("includes managedProductId in the request when provided so goals are scoped to that product", async () => {
    mockGet.mockResolvedValue(GOAL_PAGE);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useLinkGoalCandidates({ enabled: true, managedProductId: 42 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, params] = mockGet.mock.calls[0] as [string, Record<string, unknown>];
    expect(params.managedProductId).toBe(42);
  });

  it("omits managedProductId from the request when not provided so all-org queries work without the filter", async () => {
    mockGet.mockResolvedValue(GOAL_PAGE);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useLinkGoalCandidates({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, params] = mockGet.mock.calls[0] as [string, Record<string, unknown>];
    expect(params).not.toHaveProperty("managedProductId");
  });

  it("returns hasMore false and stops fetching when the backend reports no more pages", async () => {
    mockGet.mockResolvedValue(GOAL_PAGE);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useLinkGoalCandidates({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it("reports hasNextPage true when the backend returns hasMore so the sentinel triggers the next fetch", async () => {
    mockGet.mockResolvedValue({ ...GOAL_PAGE, hasMore: true, nextCursor: "cursor-xyz" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useLinkGoalCandidates({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(true);
  });
});
