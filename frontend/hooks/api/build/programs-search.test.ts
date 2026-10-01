import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { usePrograms } from "@/hooks/api/build/programs";

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

describe("usePrograms — search param forwarding", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes q in request params when q is provided so server filters across all pages", async () => {
    renderHook(() => usePrograms({ q: "launch-2026" }), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(params).toMatchObject({ q: "launch-2026" });
  });

  it("omits q from request params when not provided so no spurious filter is applied", async () => {
    renderHook(() => usePrograms({}), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string> | undefined];
    expect(params?.q).toBeUndefined();
  });
});
