import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn((options: { queryFn: (ctx: { signal: AbortSignal }) => unknown; queryKey: unknown }) => {
    void options.queryFn({ signal: new AbortController().signal });
    return { data: undefined, isLoading: true, isError: false, error: null };
  }),
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((factory: () => unknown) => factory),
}));

import { useViews } from "../advanced";

const PROJECT_ID = 42;

describe("useViews — search param is forwarded to the API endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });
  });

  it("passes search in the request query when a search term is provided", () => {
    useViews(PROJECT_ID, { search: "sprint" });
    const [, requestParams] = (apiClient.get as jest.Mock).mock.calls[0] as [unknown, Record<string, string> | undefined];
    expect(requestParams).toMatchObject({ search: "sprint" });
  });

  it("omits search from the request query when search is absent (no-search control)", () => {
    useViews(PROJECT_ID, {});
    const [, requestParams] = (apiClient.get as jest.Mock).mock.calls[0] as [unknown, Record<string, string> | undefined];
    expect(requestParams?.search).toBeUndefined();
  });

  it("includes search in the query key so different searches get separate cache entries", () => {
    const { useQuery } = jest.requireMock("@tanstack/react-query") as { useQuery: jest.Mock };
    useViews(PROJECT_ID, { search: "sprint" });
    const capturedKey = (useQuery.mock.calls[0] as [{ queryKey: unknown[] }])[0].queryKey;
    const base = buildWorkQueryKeys.projects.views(PROJECT_ID);
    expect(capturedKey).toEqual([...base, { search: "sprint" }]);
  });
});
