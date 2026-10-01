import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useRoadmapItems } from "@/hooks/api/build/roadmap";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: [],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    }),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((factory: () => unknown) => factory),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

const { apiClient } = require("@/lib/api-client") as { apiClient: { get: jest.Mock } };

describe("useRoadmapItems — search param forwarding", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes search in request params so the server filters roadmap items beyond the first cursor page", async () => {
    renderHook(() => useRoadmapItems({ search: "mobile-redesign" }), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(params).toMatchObject({ search: "mobile-redesign" });
  });

  it("omits search from request params when not provided so no spurious filter is applied", async () => {
    renderHook(() => useRoadmapItems({}), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, unknown> | undefined];
    expect(params?.search).toBeUndefined();
  });
});
