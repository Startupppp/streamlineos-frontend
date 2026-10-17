import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useModulePages } from "@/hooks/api/build/modules";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: [],
      pagination: { limit: 50, hasMore: false, nextCursor: null },
    }),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

const { apiClient } = jest.requireMock("@/lib/api-client");

describe("useModulePages — search param forwarding (B10)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("with search term — request params include search so page 2 matches are not missed by a client filter (BE-134 failing first)", async () => {
    renderHook(() => useModulePages(1, "auth"), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(params).toMatchObject({ search: "auth" });
  });

  it("without search term — request params do not carry search so no spurious filter is applied (BE-141 positive control)", async () => {
    renderHook(() => useModulePages(1, undefined), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(params?.search).toBeUndefined();
  });
});
