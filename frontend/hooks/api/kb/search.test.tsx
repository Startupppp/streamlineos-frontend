import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { useKbPageFullSearch } from "./search";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
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
