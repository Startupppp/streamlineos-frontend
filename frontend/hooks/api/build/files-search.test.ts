import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useProjectFiles } from "@/hooks/api/build/project-files";

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

const { apiClient } = require("@/lib/api-client");

describe("useProjectFiles — search param forwarding (ticket-47)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes q in the request query when a search term is provided so server-side rows beyond page 1 are found", async () => {
    renderHook(() => useProjectFiles(1, { q: "report" }), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(params).toMatchObject({ q: "report" });
  });

  it("omits q from the request query when search is absent so no spurious filter is applied", async () => {
    renderHook(() => useProjectFiles(1, {}), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string> | undefined];
    expect(params?.q).toBeUndefined();
  });
});
