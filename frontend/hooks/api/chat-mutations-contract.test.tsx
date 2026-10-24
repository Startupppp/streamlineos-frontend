jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/lib/api-envelope", () => ({
  ...jest.requireActual("@/lib/api-envelope"),
  lazyContract: jest.fn((fn: () => unknown) => fn),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1", name: "Test User", image: null } } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useAccess: jest.fn(() => ({ data: { isOrgOwner: false, scopes: {}, modules: {} }, refetch: jest.fn() })),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn((_permission: string, options: Record<string, unknown>) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  }),
}));

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useSendMessage, useEditMessage, useDeleteMessage } from "@/hooks/api/chat-message-mutations";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import type { MessagesPage } from "@/types/chat";

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;
const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const emptyPage: InfiniteData<MessagesPage> = {
  pages: [{ messages: [], nextCursor: null }],
  pageParams: [undefined],
};

describe("useSendMessage — optimistic cache patch", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("appends an optimistic message with id < 0 to page[0] before the server responds, making the send feel instant", async () => {
    const qc = makeClient();
    qc.setQueryData(collaborationQueryKeys.chat.messages(7), emptyPage);

    mockPost.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSendMessage(), { wrapper: makeWrapper(qc) });
    act(() => { result.current.mutate({ channelId: 7, content: "hello from test" }); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    const cached = qc.getQueryData<InfiniteData<MessagesPage>>(collaborationQueryKeys.chat.messages(7));
    expect(cached?.pages[0]?.messages).toHaveLength(1);
    const optimistic = cached?.pages[0]?.messages[0];
    expect(optimistic?.id).toBeLessThan(0);
    expect(optimistic?.content).toBe("hello from test");
    expect(optimistic?.channelId).toBe(7);
  });

  it("restores the cache to its pre-mutation state when the server rejects the message so the UI rolls back cleanly", async () => {
    const qc = makeClient();
    qc.setQueryData(collaborationQueryKeys.chat.messages(7), emptyPage);

    mockPost.mockRejectedValue(new Error("Server rejected"));

    const { result } = renderHook(() => useSendMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 7, content: "failed send" }).catch(() => {});
    });

    const cached = qc.getQueryData<InfiniteData<MessagesPage>>(collaborationQueryKeys.chat.messages(7));
    expect(cached?.pages[0]?.messages).toHaveLength(0);
  });
});

function refetching(spy: jest.SpyInstance, queryKey: readonly unknown[]) {
  return spy.mock.calls.filter(
    ([filters]) =>
      filters?.refetchType !== "none" &&
      JSON.stringify(filters?.queryKey) === JSON.stringify(queryKey),
  );
}

const sentRow = {
  id: 999,
  orgId: "org-1",
  channelId: 7,
  senderMembershipId: 1,
  content: "sent",
  replyToId: null,
  isEdited: false,
  isDeleted: false,
  messageType: "text",
  metadata: null,
  actionStatus: null,
  clientKey: "ck-sent",
  channelPosition: 1,
  createdAt: "2026-09-30T10:00:00.000Z",
  updatedAt: "2026-09-30T10:00:00.000Z",
};

const storedMessage = {
  id: 42,
  channelId: 3,
  senderId: "user-1",
  content: "before",
  replyToId: null,
  isEdited: false,
  isDeleted: false,
  messageType: "text" as const,
  metadata: null,
  actionStatus: null,
  reactions: {},
  createdAt: "2026-09-30T10:00:00.000Z",
  updatedAt: "2026-09-30T10:00:00.000Z",
  sender: { id: "user-1", name: "Test User", image: null },
  attachments: [],
  replyTo: null,
};

function seedChannel3(qc: QueryClient) {
  qc.setQueryData<InfiniteData<MessagesPage>>(collaborationQueryKeys.chat.messages(3), {
    pages: [{ messages: [storedMessage], nextCursor: null }],
    pageParams: [undefined],
  });
}

describe("useSendMessage — reconciles in place after success", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("swaps the server row in for the optimistic copy instead of refetching the channel's messages", async () => {
    const qc = makeClient();
    qc.setQueryData(collaborationQueryKeys.chat.messages(7), emptyPage);
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    mockPost.mockResolvedValue(sentRow as never);

    const { result } = renderHook(() => useSendMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 7, content: "sent", clientKey: "ck-sent" });
    });

    const cached = qc.getQueryData<InfiniteData<MessagesPage>>(collaborationQueryKeys.chat.messages(7));
    expect(cached?.pages[0]?.messages.map((m) => m.id)).toEqual([999]);
    expect(refetching(invalidateSpy, collaborationQueryKeys.chat.messages(7))).toEqual([]);
  });

  it("does not refetch myChannels for the sidebar preview, which the send already patched", async () => {
    const qc = makeClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    mockPost.mockResolvedValue(sentRow as never);

    const { result } = renderHook(() => useSendMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 7, content: "sent" });
    });

    expect(refetching(invalidateSpy, collaborationQueryKeys.chat.myChannels())).toEqual([]);
  });
});

describe("useEditMessage — patches instead of refetching", () => {
  beforeEach(() => {
    mockPatch.mockReset();
  });

  it("writes the edit into the channel's cached messages without refetching them", async () => {
    const qc = makeClient();
    seedChannel3(qc);
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    mockPatch.mockResolvedValue({ ok: true } as never);

    const { result } = renderHook(() => useEditMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 3, messageId: 42, content: "edited" });
    });

    const cached = qc.getQueryData<InfiniteData<MessagesPage>>(collaborationQueryKeys.chat.messages(3));
    expect(cached?.pages[0]?.messages[0]).toEqual(expect.objectContaining({ content: "edited", isEdited: true }));
    expect(refetching(invalidateSpy, collaborationQueryKeys.chat.messages(3))).toEqual([]);
  });

  it("no longer sweeps chat.all, which discarded every other channel's messages, pins and saved messages", async () => {
    const qc = makeClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    mockPatch.mockResolvedValue({ ok: true } as never);

    const { result } = renderHook(() => useEditMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 3, messageId: 42, content: "edited" });
    });

    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: collaborationQueryKeys.chat.all }),
    );
  });
});

describe("useDeleteMessage — patches instead of refetching", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it("tombstones the message in its pin and saved copy instead of refetching pins and saved messages", async () => {
    const qc = makeClient();
    seedChannel3(qc);
    qc.setQueryData(collaborationQueryKeys.chat.pins(3), [
      { id: 1, channelId: 3, messageId: 42, pinnedAt: "2026-09-30T10:00:00.000Z", pinnedBy: null, pinnedByUser: null, message: storedMessage },
    ]);
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    mockDelete.mockResolvedValue({ ok: true } as never);

    const { result } = renderHook(() => useDeleteMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 3, messageId: 42 });
    });

    const pins = qc.getQueryData<Array<{ message: { isDeleted: boolean } }>>(collaborationQueryKeys.chat.pins(3));
    expect(pins?.[0]?.message.isDeleted).toBe(true);
    expect(refetching(invalidateSpy, collaborationQueryKeys.chat.pins(3))).toEqual([]);
    expect(refetching(invalidateSpy, collaborationQueryKeys.chat.savedMessages())).toEqual([]);
  });

  it("no longer sweeps chat.all for a delete the realtime patch already applied", async () => {
    const qc = makeClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    mockDelete.mockResolvedValue({ ok: true } as never);

    const { result } = renderHook(() => useDeleteMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 3, messageId: 42 });
    });

    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: collaborationQueryKeys.chat.all }),
    );
  });
});
