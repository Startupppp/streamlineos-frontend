import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useProjectTemplates } from "@/hooks/api/build/templates";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      pages: [{ data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } }],
      pageParams: [undefined],
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

describe("useProjectTemplates — search param forwarding", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes q in request params so the server filters templates that fall outside the first page", async () => {
    renderHook(() => useProjectTemplates({ q: "sprint-retro" }), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string> | undefined];
    expect(params).toMatchObject({ q: "sprint-retro" });
  });

  it("omits q from request params when not provided so no spurious filter is applied", async () => {
    renderHook(() => useProjectTemplates({}), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const [, params] = apiClient.get.mock.calls[0] as [string, Record<string, string> | undefined];
    expect(params?.q).toBeUndefined();
  });
});
