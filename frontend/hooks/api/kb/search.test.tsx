import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { useKbPageFullSearch } from "./search";
import { KB_PAGE_SEARCH_MAX_LENGTH, useKbPagesSearch } from "./pages";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("./spaces", () => ({
  useKbSpaces: () => ({
    data: { data: [], pagination: { limit: 100, hasMore: false, nextCursor: null } },
    isLoading: false,
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

const get = apiClient.get as jest.Mock;

describe("useKbPageFullSearch first-read recovery", () => {
  it("keeps a failed search inline and allows a retry after the first page fails", async () => {
    const error = new ApiError("Search unavailable", 503, "BACKEND_UNREACHABLE");
    get.mockRejectedValueOnce(error).mockResolvedValueOnce({
      items: [],
      hasMore: false,
      nextCursor: null,
      limit: 20,
      facets: null,
    });
    const client = createAppQueryClient();
    client.setDefaultOptions({
      ...client.getDefaultOptions(),
      queries: {
        ...client.getDefaultOptions().queries,
        retry: false,
      },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => useKbPageFullSearch({ q: "runbook" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(result.current.data).toBeUndefined();

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.items).toEqual([]);
    expect(get).toHaveBeenCalledTimes(2);
    client.clear();
  });
});

describe("useKbPagesSearch query cap (KB-B-012)", () => {
  function render(q: string) {
    const client = createAppQueryClient();
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return { client, ...renderHook(() => useKbPagesSearch(q), { wrapper }) };
  }

  it("sends at most the backend's 200 characters, so a long paste cannot become a 400", async () => {
    get.mockReset().mockResolvedValue({ items: [], hasMore: false });
    const { client, result } = render("lorem ipsum ".repeat(25));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith("/kb/pages/search", { q: "lorem ipsum ".repeat(25).slice(0, KB_PAGE_SEARCH_MAX_LENGTH) }, expect.anything(), expect.anything());
    client.clear();
  });

  it("sends a short query unchanged", async () => {
    get.mockReset().mockResolvedValue({ items: [], hasMore: false });
    const { client, result } = render("runbook");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith("/kb/pages/search", { q: "runbook" }, expect.anything(), expect.anything());
    client.clear();
  });

  it("keeps a failed page search inline instead of throwing to the wiki error boundary", async () => {
    const error = new ApiError("Validation failed", 400, "VALIDATION_FAILED");
    get.mockReset().mockRejectedValue(error);
    const { client, result } = render("runbook");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    client.clear();
  });
});
