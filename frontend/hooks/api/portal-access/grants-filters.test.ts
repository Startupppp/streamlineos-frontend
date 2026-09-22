import { renderHook } from "@testing-library/react";
import { useProjectClientGrants } from "./grants";

const mockApiGet = jest
  .fn()
  .mockResolvedValue({
    data: [],
    pagination: { hasMore: false, nextCursor: null, limit: 20 },
  });

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const mockUseQuery = jest.fn().mockReturnValue({
  data: undefined,
  isLoading: false,
  isError: false,
});
const mockUseQueryClient = jest.fn().mockReturnValue({
  invalidateQueries: jest.fn(),
  setQueryData: jest.fn(),
});

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

beforeEach(() => jest.clearAllMocks());

describe("useProjectClientGrants — filter params", () => {
  it("passes q to the query key when provided so cache entries for different searches are distinct", () => {
    renderHook(() => useProjectClientGrants({ limit: 20, q: "alice" }));
    const call = mockUseQuery.mock.calls[0]?.[0];
    const key = JSON.stringify(call.queryKey);
    expect(key).toContain("alice");
  });

  it("passes state to the query key when provided so expired-only and active-only results are cached separately", () => {
    renderHook(() => useProjectClientGrants({ limit: 20, state: "expired" }));
    const call = mockUseQuery.mock.calls[0]?.[0];
    const key = JSON.stringify(call.queryKey);
    expect(key).toContain("expired");
  });

  it("passes permission to the query key when provided so capability-filtered results are cached separately", () => {
    renderHook(() =>
      useProjectClientGrants({ limit: 20, permission: "canViewMilestones" }),
    );
    const call = mockUseQuery.mock.calls[0]?.[0];
    const key = JSON.stringify(call.queryKey);
    expect(key).toContain("canViewMilestones");
  });

  it("does not include q in the query key when absent so the default cache entry remains unaffected", () => {
    renderHook(() => useProjectClientGrants({ limit: 20 }));
    const call = mockUseQuery.mock.calls[0]?.[0];
    const key = JSON.stringify(call.queryKey);
    expect(key).not.toContain('"q"');
    expect(key).not.toContain('"state"');
    expect(key).not.toContain('"permission"');
  });
});
