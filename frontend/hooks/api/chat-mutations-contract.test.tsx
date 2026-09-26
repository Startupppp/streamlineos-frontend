jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/lib/api-envelope", () => ({
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
    const { useMutation } = require("@tanstack/react-query");
    return useMutation(options);
  }),
}));

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useSendMessage, useEditMessage, useDeleteMessage } from "@/hooks/api/chat-core-mutations-a";
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

describe("useSendMessage — post-success invalidations", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("invalidates the channel's message list after a successful send so fresh server messages are fetched", async () => {
    const qc = makeClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    mockPost.mockResolvedValue({ id: 999, channelId: 7 } as never);

    const { result } = renderHook(() => useSendMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 7, content: "sent" });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: collaborationQueryKeys.chat.messages(7) }),
    );
  });

  it("invalidates myChannels after a successful send so the sidebar last-message preview updates", async () => {
    const qc = makeClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    mockPost.mockResolvedValue({ id: 999, channelId: 7 } as never);

    const { result } = renderHook(() => useSendMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 7, content: "sent" });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: collaborationQueryKeys.chat.myChannels() }),
    );
  });
});

describe("useEditMessage — post-success invalidation", () => {
  beforeEach(() => {
    mockPatch.mockReset();
  });

  it("invalidates chat.all after a successful edit so every chat surface that renders the edited message is refreshed", async () => {
    const qc = makeClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    mockPatch.mockResolvedValue({ ok: true } as never);

    const { result } = renderHook(() => useEditMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 3, messageId: 42, content: "edited" });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: collaborationQueryKeys.chat.all }),
    );
  });
});

describe("useDeleteMessage — post-success invalidation", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it("invalidates chat.all after a successful delete so every chat surface stops rendering the deleted message", async () => {
    const qc = makeClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    mockDelete.mockResolvedValue({ ok: true } as never);

    const { result } = renderHook(() => useDeleteMessage(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: 3, messageId: 42 });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: collaborationQueryKeys.chat.all }),
    );
  });
});
