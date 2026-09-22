import { renderHook, act } from "@testing-library/react";
import { ZodError } from "zod";

import { usePresenceCustomStatus, usePresenceMap } from "./chat-core-read";

const mockUseQuery = jest.fn((_options: { queryKey: unknown }): { data: unknown } => ({
  data: undefined,
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: unknown }) => mockUseQuery(options),
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

const ROW = {
  userId: "u1",
  status: "BUSY",
  statusMessage: "Heads-down until 3pm",
  statusExpiresAt: "2026-09-18T15:00:00.000Z",
  lastSeenAt: "2026-09-18T09:30:00.000Z",
  userName: null,
  userImage: null,
};

beforeEach(() => {
  mockUseQuery.mockClear();
  mockUseQuery.mockReturnValue({ data: undefined });
});

describe("usePresenceCustomStatus — the custom message and its expiry reach the UI", () => {
  it("carries the message and expiry the backend returned, which an omitted contract field would have stripped", () => {
    mockUseQuery.mockReturnValue({ data: [ROW] });

    const { result } = renderHook(() => usePresenceCustomStatus("u1"));
    act(() => {});

    expect(result.current.statusMessage).toBe("Heads-down until 3pm");
    expect(result.current.statusExpiresAt).toBe("2026-09-18T15:00:00.000Z");
  });

  it("answers nulls for a member with no row, so the picker shows an empty box rather than someone else's message", () => {
    mockUseQuery.mockReturnValue({ data: [ROW] });

    const { result } = renderHook(() => usePresenceCustomStatus("someone-else"));
    act(() => {});

    expect(result.current.statusMessage).toBeNull();
    expect(result.current.statusExpiresAt).toBeNull();
  });

  it("answers nulls before the session resolves a user id", () => {
    mockUseQuery.mockReturnValue({ data: [ROW] });

    const { result } = renderHook(() => usePresenceCustomStatus(undefined));
    act(() => {});

    expect(result.current.statusMessage).toBeNull();
  });

  it("tolerates a row that omits the fields, so a backend predating the columns does not blank the picker", () => {
    mockUseQuery.mockReturnValue({
      data: [{ userId: "u1", status: "ONLINE", lastSeenAt: "2026-09-18T09:30:00.000Z", userName: null, userImage: null }],
    });

    const { result } = renderHook(() => usePresenceCustomStatus("u1"));
    act(() => {});

    expect(result.current.statusMessage).toBeNull();
    expect(result.current.statusExpiresAt).toBeNull();
  });

  it("shares the online-users query with usePresenceMap, so reading the message costs no extra request", () => {
    renderHook(() => {
      usePresenceMap();
      usePresenceCustomStatus("u1");
    });

    const keys = mockUseQuery.mock.calls.map(([opts]) =>
      JSON.stringify(opts.queryKey),
    );
    expect(new Set(keys).size).toBe(1);
  });
});

describe("chatOnlineUsersContract — the new fields survive the parse", () => {
  it("keeps statusMessage and statusExpiresAt instead of stripping them on decode", async () => {
    const { chatOnlineUsersContract } = await import("@/hooks/api/chat-schema/presence-schema");

    const [parsed] = chatOnlineUsersContract.parse([ROW]);

    expect(parsed?.statusMessage).toBe("Heads-down until 3pm");
    expect(parsed?.statusExpiresAt).toBe("2026-09-18T15:00:00.000Z");
  });

  it("accepts an explicit null for a member who cleared their message", async () => {
    const { chatOnlineUsersContract } = await import("@/hooks/api/chat-schema/presence-schema");

    expect(() =>
      chatOnlineUsersContract.parse([{ ...ROW, statusMessage: null, statusExpiresAt: null }]),
    ).not.toThrow();
  });

  it("throws on a wrongly typed expiry rather than handing a Date to a string consumer", async () => {
    const { chatOnlineUsersContract } = await import("@/hooks/api/chat-schema/presence-schema");

    expect(() =>
      chatOnlineUsersContract.parse([{ ...ROW, statusExpiresAt: new Date() }]),
    ).toThrow(ZodError);
  });
});
