import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useAllWork } from "@/hooks/api/build/all-work";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: [],
      nextCursor: null,
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

describe("useAllWork — search param forwarding", () => {
  beforeEach(() => jest.clearAllMocks());

  it("with search term — forwards search in request params so rows outside the first cursor page are not missed by client-side filter", async () => {
    renderHook(() => useAllWork({ search: "deploy-pipeline" }), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(params).toMatchObject({ search: "deploy-pipeline" });
  });

  it("without search term — request params do not carry search (positive control: no spurious filter applied)", async () => {
    renderHook(() => useAllWork({ limit: 25 }), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(params?.search).toBeUndefined();
  });
});
