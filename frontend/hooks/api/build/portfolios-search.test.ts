import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { usePortfolios } from "@/hooks/api/build/portfolios";

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

const { apiClient } = jest.requireMock("@/lib/api-client") as { apiClient: { get: jest.Mock } };

describe("usePortfolios — search param forwarding", () => {
  beforeEach(() => jest.clearAllMocks());

  it("maps search to q in request params so server filters rows beyond the first page", async () => {
    renderHook(() => usePortfolios({ search: "flagship" }), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(params).toMatchObject({ q: "flagship" });
  });

  it("omits q when search is absent so no spurious filter is applied", async () => {
    renderHook(() => usePortfolios({}), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string> | undefined];
    expect(params?.q).toBeUndefined();
  });
});
