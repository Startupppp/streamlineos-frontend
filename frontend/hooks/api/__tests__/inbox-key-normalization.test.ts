import { useInfiniteQuery } from "@tanstack/react-query";

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useInfiniteQuery: jest.fn((opts: unknown) => opts),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (fn: unknown) => fn,
}));

const mockInfiniteQuery = useInfiniteQuery as jest.Mock;

interface CapturedInfiniteOptions {
  queryKey: readonly unknown[];
  enabled: boolean;
}

function captureInboxOptions(params?: {
  limit?: number;
  kinds?: string[];
  unreadOnly?: boolean;
}): CapturedInfiniteOptions {
  mockInfiniteQuery.mockClear();
  const { useUnifiedInbox } = jest.requireActual<
    typeof import("@/hooks/api/inbox")
  >("@/hooks/api/inbox");
  useUnifiedInbox(params as Parameters<typeof useUnifiedInbox>[0]);
  const call = mockInfiniteQuery.mock.calls[0]?.[0] as CapturedInfiniteOptions;
  if (!call) throw new Error("useUnifiedInbox did not open a query");
  return call;
}

describe("useUnifiedInbox key normalization (R1)", () => {
  beforeEach(() => {
    mockInfiniteQuery.mockClear();
  });

  it("default call and explicit limit=25 call produce identical query keys", () => {
    const keyDefault = captureInboxOptions(undefined).queryKey;
    const keyWith25 = captureInboxOptions({ limit: 25 }).queryKey;
    expect(keyDefault).toEqual(keyWith25);
  });

  it("undefined unreadOnly and false unreadOnly produce identical query keys", () => {
    const keyUndefined = captureInboxOptions({ unreadOnly: undefined }).queryKey;
    const keyFalse = captureInboxOptions({ unreadOnly: false }).queryKey;
    expect(keyUndefined).toEqual(keyFalse);
  });

  it("kinds array in different orders produces identical query keys", () => {
    const key1 = captureInboxOptions({
      kinds: ["MAIL", "TASK"] as string[],
    }).queryKey;
    const key2 = captureInboxOptions({
      kinds: ["TASK", "MAIL"] as string[],
    }).queryKey;
    expect(key1).toEqual(key2);
  });

  it("the query key does not contain undefined for the default limit", () => {
    const { queryKey } = captureInboxOptions(undefined);
    const serialized = JSON.stringify(queryKey);
    expect(serialized).not.toContain('"limit":null');
    expect(serialized).toContain('"limit":25');
  });
});
