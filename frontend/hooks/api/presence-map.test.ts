import { renderHook, act } from "@testing-library/react";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { usePresenceMap, useChatOnlineUsers } from "./chat-core-read";

const mockUseQuery = jest.fn(() => ({ data: undefined }));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useInfiniteQuery: jest.fn(() => ({ data: undefined })),
}));
jest.mock("next-auth/react", () => ({ useSession: jest.fn(() => ({ data: null })) }));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
  useModuleEnabled: jest.fn(() => false),
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));
jest.mock("@/lib/api-envelope", () => ({ lazyContract: jest.fn((fn: () => unknown) => fn) }));
jest.mock("@/lib/query-error-policy", () => ({ INLINE_READ_ERROR: {} }));
jest.mock("@/lib/observability/error-reporter", () => ({ reportError: jest.fn() }));
jest.mock("@/hooks/api/cursor-page-param", () => ({ NO_ID_CURSOR_YET: null }));

describe("usePresenceMap — issues ONE request shared by many consumers, preventing an N+1 per avatar", () => {
  beforeEach(() => {
    mockUseQuery.mockClear();
    mockUseQuery.mockReturnValue({ data: undefined });
  });

  it("usePresenceMap and useChatOnlineUsers share the same query key so TanStack Query deduplicates them into one HTTP request", () => {
    renderHook(() => {
      usePresenceMap();
      usePresenceMap();
      useChatOnlineUsers();
    });

    const callArgs: Array<{ queryKey: unknown }> = mockUseQuery.mock.calls.map(
      ([opts]: [{ queryKey: unknown }]) => opts,
    );
    const keys = callArgs.map((a) => JSON.stringify(a.queryKey));
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(1);
    expect(keys[0]).toContain("onlineUsers");
  });

  it("usePresenceMap builds an empty map when the online users data is undefined", () => {
    mockUseQuery.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => usePresenceMap());
    act(() => {});
    expect(result.current.size).toBe(0);
  });

  it("usePresenceMap maps each userId to its status so the dot colour is correct", () => {
    mockUseQuery.mockReturnValue({
      data: [
        { userId: "u1", status: "ONLINE", lastSeenAt: "2026-09-16T10:00:00Z", userName: null, userImage: null },
        { userId: "u2", status: "BUSY", lastSeenAt: "2026-09-16T10:00:00Z", userName: null, userImage: null },
      ],
    });

    const { result } = renderHook(() => usePresenceMap());
    act(() => {});
    expect(result.current.get("u1")).toBe("ONLINE");
    expect(result.current.get("u2")).toBe("BUSY");
  });

  it("usePresenceMap returns undefined for a userId not in the response so the avatar shows no dot rather than an incorrect offline dot", () => {
    mockUseQuery.mockReturnValue({
      data: [
        { userId: "u1", status: "ONLINE", lastSeenAt: "2026-09-16T10:00:00Z", userName: null, userImage: null },
      ],
    });

    const { result } = renderHook(() => usePresenceMap());
    act(() => {});
    expect(result.current.get("unknown-user")).toBeUndefined();
  });

  it("the onlineUsers query key is stable across invocations so the cache hit rate is 100% with many avatar consumers", () => {
    const key1 = collaborationQueryKeys.chat.onlineUsers();
    const key2 = collaborationQueryKeys.chat.onlineUsers();
    expect(JSON.stringify(key1)).toBe(JSON.stringify(key2));
  });
});
