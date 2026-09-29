import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useAutomations } from "@/hooks/api/build/automations";

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

const { apiClient } = require("@/lib/api-client");

describe("useAutomations — search param forwarding (B10)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("with search term — request params include search so page 2 matches are not missed by a client filter (BE-134 failing first)", async () => {
    renderHook(() => useAutomations(1, { search: "notify" }), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(params).toMatchObject({ search: "notify" });
  });

  it("without search term — request params do not carry search so no spurious filter is applied (BE-141 positive control)", async () => {
    renderHook(() => useAutomations(1, {}), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(params?.search).toBeUndefined();
  });
});
