import { renderHook, act } from "@testing-library/react";
import { useClientAccessUrlState } from "./use-client-access-url-state";

const mockRouterReplace = jest.fn();
let mockSearchParamsMap: Record<string, string> = {};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace, push: jest.fn() }),
  usePathname: () => "/build/settings/client-access",
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsMap[key] ?? null,
    toString: () =>
      Object.entries(mockSearchParamsMap)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&"),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParamsMap = {};
});

describe("useClientAccessUrlState", () => {
  it("returns empty strings for q, state, permission when the URL has no params", () => {
    const { result } = renderHook(() => useClientAccessUrlState());
    expect(result.current.q).toBe("");
    expect(result.current.state).toBe("");
    expect(result.current.permission).toBe("");
  });

  it("reads q from the URL search params", () => {
    mockSearchParamsMap = { q: "alice" };
    const { result } = renderHook(() => useClientAccessUrlState());
    expect(result.current.q).toBe("alice");
  });

  it("reads state from the URL search params", () => {
    mockSearchParamsMap = { state: "expired" };
    const { result } = renderHook(() => useClientAccessUrlState());
    expect(result.current.state).toBe("expired");
  });

  it("reads permission from the URL search params", () => {
    mockSearchParamsMap = { permission: "canViewMilestones" };
    const { result } = renderHook(() => useClientAccessUrlState());
    expect(result.current.permission).toBe("canViewMilestones");
  });

  it("setFilter with q calls router.replace with q in the URL", () => {
    const { result } = renderHook(() => useClientAccessUrlState());
    act(() => result.current.setFilter("q", "bob"));
    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining("q=bob"),
      expect.anything(),
    );
  });

  it("setFilter with an empty value removes the key from the URL", () => {
    mockSearchParamsMap = { q: "alice" };
    const { result } = renderHook(() => useClientAccessUrlState());
    act(() => result.current.setFilter("q", ""));
    const call = mockRouterReplace.mock.calls[0]?.[0] as string;
    expect(call).not.toContain("q=");
  });

  it("setFilter with a filter key removes the cursor so page 1 is reloaded when filters change", () => {
    mockSearchParamsMap = { q: "alice", cursor: "abc123" };
    const { result } = renderHook(() => useClientAccessUrlState());
    act(() => result.current.setFilter("state", "active"));
    const call = mockRouterReplace.mock.calls[0]?.[0] as string;
    expect(call).not.toContain("cursor=");
  });

  it("hasActiveFilters is false when no filter params are present", () => {
    const { result } = renderHook(() => useClientAccessUrlState());
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("hasActiveFilters is true when q is set", () => {
    mockSearchParamsMap = { q: "alice" };
    const { result } = renderHook(() => useClientAccessUrlState());
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("hasActiveFilters is true when state is set", () => {
    mockSearchParamsMap = { state: "expired" };
    const { result } = renderHook(() => useClientAccessUrlState());
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("resetFilters removes q, state, and permission from the URL", () => {
    mockSearchParamsMap = { q: "alice", state: "expired" };
    const { result } = renderHook(() => useClientAccessUrlState());
    act(() => result.current.resetFilters());
    const call = mockRouterReplace.mock.calls[0]?.[0] as string;
    expect(call).not.toContain("q=");
    expect(call).not.toContain("state=");
  });
});
