import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { knowledgeGapsKeys } from "./knowledge-gaps";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    patch: jest.fn(),
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((fn: () => unknown) => fn),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(
    (_permission: string, options: Record<string, unknown>) => {
      const { useMutation } = jest.requireActual("@tanstack/react-query");
      return useMutation(options);
    },
  ),
}));

import { apiClient } from "@/lib/api-client";

describe("useUpdateSupportKbArticle — knowledge-gaps cache invalidation on publish", () => {
  function makeClient() {
    return new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  }

  function wrapper(qc: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: qc }, children);
    };
  }

  it("invalidates the knowledge-gaps list when an article is published so the awaiting-review badge clears", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 5, status: "published" });
    const qc = makeClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const { useUpdateSupportKbArticle } = await import("./kb");
    const { result } = renderHook(() => useUpdateSupportKbArticle(), {
      wrapper: wrapper(qc),
    });

    await act(async () => {
      result.current.mutate({ id: 5, status: "published" });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: knowledgeGapsKeys.all }),
    );
  });

  it("does not invalidate knowledge-gaps when an article status change is not a publish", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ id: 5, status: "in_review" });
    const qc = makeClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const { useUpdateSupportKbArticle } = await import("./kb");
    const { result } = renderHook(() => useUpdateSupportKbArticle(), {
      wrapper: wrapper(qc),
    });

    await act(async () => {
      result.current.mutate({ id: 5, status: "in_review" });
      await new Promise((r) => setTimeout(r, 0));
    });

    const knowledgeGapInvalidations = invalidateSpy.mock.calls.filter(
      ([opts]) =>
        JSON.stringify(opts) === JSON.stringify({ queryKey: knowledgeGapsKeys.all }),
    );
    expect(knowledgeGapInvalidations).toHaveLength(0);
  });
});
