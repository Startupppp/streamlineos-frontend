jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock("@/lib/observability/error-reporter", () => ({
  reportError: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => false),
}));

jest.mock("@/lib/query-error-policy", () => ({
  INLINE_READ_ERROR: {},
}));

jest.mock("@/hooks/api/cursor-page-param", () => ({
  NO_ID_CURSOR_YET: undefined,
  NULL_CURSOR_YET: null,
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { reportError } from "@/lib/observability/error-reporter";
import { usePublicChannels } from "@/hooks/api/chat-core-read";
import { freshClient, wrapperFor } from "@/hooks/api/chat-cache-test-harness";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockReportError = reportError as jest.MockedFunction<typeof reportError>;

async function loadPageAfter(cursor: string | undefined, page: { channels: readonly unknown[]; nextCursor: string | null }) {
  if (cursor === undefined) mockGet.mockResolvedValueOnce(page);
  else mockGet.mockResolvedValueOnce({ channels: [], nextCursor: cursor }).mockResolvedValueOnce(page);
  const { result } = renderHook(() => usePublicChannels(true), { wrapper: wrapperFor(freshClient()) });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  if (cursor !== undefined) {
    act(() => result.current.loadMore());
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));
  }
  return result.current;
}

const STUB_CHANNELS = [{ id: 1, name: "general", type: "PUBLIC" }] as const;

function isPrefixOf(prefix: readonly unknown[], key: readonly unknown[]): boolean {
  return prefix.length <= key.length && prefix.every((part, i) => part === key[i]);
}

describe("channel paging — stale cursor guard", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockReportError.mockReset();
  });

  it("passes the page through without modification when the server returns a different nextCursor", async () => {
    const result = await loadPageAfter("cursor-a", { channels: STUB_CHANNELS, nextCursor: "cursor-b" });
    expect(result.hasMore).toBe(true);
    expect(mockReportError).not.toHaveBeenCalled();
  });

  it("caps nextCursor to null when the server echoes the requested cursor back, preventing an infinite pagination loop", async () => {
    const result = await loadPageAfter("cursor-a", { channels: STUB_CHANNELS, nextCursor: "cursor-a" });
    expect(result.hasMore).toBe(false);
  });

  it("calls reportError when the cursor repeats so the anomaly is visible in observability", async () => {
    await loadPageAfter("cursor-x", { channels: STUB_CHANNELS, nextCursor: "cursor-x" });
    expect(mockReportError).toHaveBeenCalledTimes(1);
    const [err] = mockReportError.mock.calls[0] as [unknown, ...unknown[]];
    expect(err).toBeInstanceOf(Error);
  });

  it("preserves the channels array when capping the cursor so no messages are silently dropped", async () => {
    const result = await loadPageAfter("cursor-a", { channels: STUB_CHANNELS, nextCursor: "cursor-a" });
    expect(result.channels).toEqual(STUB_CHANNELS);
  });

  it("does not trigger the guard when nextCursor is null because null marks the last page not a repeated cursor", async () => {
    const result = await loadPageAfter("cursor-a", { channels: STUB_CHANNELS, nextCursor: null });
    expect(result.hasMore).toBe(false);
    expect(mockReportError).not.toHaveBeenCalled();
  });

  it("handles the first page correctly when cursor is undefined and does not falsely trigger the guard", async () => {
    const result = await loadPageAfter(undefined, { channels: STUB_CHANNELS, nextCursor: "cursor-1" });
    expect(result.hasMore).toBe(true);
    expect(mockReportError).not.toHaveBeenCalled();
  });
});

describe("collaborationQueryKeys.chat — prefix semantics for cache invalidation", () => {
  it("messages(7) includes channel id 7 so per-channel invalidation targets the right bucket", () => {
    const key = collaborationQueryKeys.chat.messages(7);
    expect(key).toContain(7);
  });

  it("messages(7) is not a prefix of messages(8) so a channel-scoped invalidation does not bleed into sibling channels", () => {
    const key7 = collaborationQueryKeys.chat.messages(7);
    const key8 = collaborationQueryKeys.chat.messages(8);
    expect(isPrefixOf(key7, key8)).toBe(false);
    expect(isPrefixOf(key8, key7)).toBe(false);
  });

  it("chat.all is a prefix of messages(7) so invalidating all chat reaches per-channel message lists", () => {
    const all = collaborationQueryKeys.chat.all;
    const msgs = collaborationQueryKeys.chat.messages(7);
    expect(isPrefixOf(Array.from(all), Array.from(msgs))).toBe(true);
  });

  it("messages(7) without cursor is a prefix of messages(7, 42) so a channel invalidation covers all loaded cursor pages", () => {
    const base = collaborationQueryKeys.chat.messages(7);
    const withCursor = collaborationQueryKeys.chat.messages(7, 42);
    expect(isPrefixOf(Array.from(base), Array.from(withCursor))).toBe(true);
  });

  it("messages(7) is not a prefix of channel(7) so invalidating message lists does not cascade into channel-detail queries", () => {
    const msgs = collaborationQueryKeys.chat.messages(7);
    const channel = collaborationQueryKeys.chat.channel(7);
    expect(isPrefixOf(Array.from(msgs), Array.from(channel))).toBe(false);
  });

  it("myChannels() is not a prefix of messages(7) so a channel-list refetch does not trigger message-list refetches", () => {
    const myChannels = collaborationQueryKeys.chat.myChannels();
    const msgs = collaborationQueryKeys.chat.messages(7);
    expect(isPrefixOf(Array.from(myChannels), Array.from(msgs))).toBe(false);
  });
});
