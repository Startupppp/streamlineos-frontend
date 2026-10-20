import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { patchChatMessage } from "@/hooks/api/chat-message-cache";
import {
  useDeleteMessage,
  useEditMessage,
  useSendMessage,
  useToggleReaction,
} from "@/hooks/api/chat-core-mutations-a";
import { useSaveMessage } from "@/hooks/api/chat-personal-a";
import type { Message, MessagesPage, SavedMessagesPage } from "@/types/chat";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada", image: null } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: true }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined) }));
jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));

const CHANNEL_ID = 7;
const TARGET_ID = 41;
const contextKey = collaborationQueryKeys.chat.messageContext(CHANNEL_ID, TARGET_ID);
const messagesKey = collaborationQueryKeys.chat.messages(CHANNEL_ID);
const mockedPost = jest.mocked(apiClient.post);
const mockedPatch = jest.mocked(apiClient.patch);
const mockedDelete = jest.mocked(apiClient.delete);

type ContextPage = { messages: Message[]; olderCursor: number | null; newerCursor: number | null };

function message(id: number, over: Partial<Message> = {}): Message {
  return {
    id,
    channelId: CHANNEL_ID,
    senderId: "user-2",
    sender: { id: "user-2", name: "Bo", image: null },
    content: `message ${id}`,
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    reactions: {},
    channelPosition: id,
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z",
    attachments: [],
    replyTo: null,
    ...over,
  };
}

let client: QueryClient;

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function contextMessage(id: number): Message | undefined {
  return client
    .getQueryData<InfiniteData<ContextPage>>(contextKey)
    ?.pages.flatMap((page) => page.messages)
    .find((m) => m.id === id);
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData<InfiniteData<MessagesPage>>(messagesKey, {
    pages: [{ messages: [message(100), message(101)], nextCursor: 99 }],
    pageParams: [undefined],
  });
  client.setQueryData<InfiniteData<ContextPage>>(contextKey, {
    pages: [
      {
        messages: [message(40), message(41, { reactions: { "👍": ["user-1", "user-3"] } }), message(42)],
        olderCursor: 40,
        newerCursor: 42,
      },
    ],
    pageParams: [{ kind: "context" }],
  });
});

describe("chat message cache — a context-window message is patched like any other copy", () => {
  it("an own edit shows in the context window at once", async () => {
    mockedPatch.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useEditMessage(), { wrapper: Wrapper });
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID, messageId: 42, content: "edited in context" });
    });
    await waitFor(() => expect(contextMessage(42)?.content).toBe("edited in context"));
    expect(contextMessage(42)?.isEdited).toBe(true);
  });

  it("an own delete tombstones the context-window copy at once", async () => {
    mockedDelete.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useDeleteMessage(), { wrapper: Wrapper });
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID, messageId: 40 });
    });
    await waitFor(() => expect(contextMessage(40)?.isDeleted).toBe(true));
  });

  it("toggling a reaction the viewer already left on a context message removes it with DELETE", async () => {
    mockedDelete.mockResolvedValue({ reactions: { "👍": ["user-3"] } });
    const { result } = renderHook(() => useToggleReaction(CHANNEL_ID), { wrapper: Wrapper });
    act(() => {
      result.current.mutate({ messageId: TARGET_ID, emoji: "👍" });
    });
    await waitFor(() => expect(contextMessage(TARGET_ID)?.reactions["👍"]).toEqual(["user-3"]));
    expect(mockedDelete).toHaveBeenCalledWith(
      `/chat/channels/${CHANNEL_ID}/messages/${TARGET_ID}/reactions/${encodeURIComponent("👍")}`,
      undefined,
      undefined,
      expect.anything(),
    );
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("a realtime edit patches the context-window copy through the same primitive the realtime handler calls", () => {
    act(() => {
      patchChatMessage(client, CHANNEL_ID, 40, { content: "changed elsewhere", isEdited: true });
    });
    expect(contextMessage(40)?.content).toBe("changed elsewhere");
  });

  it("replying to a context-window message quotes it in the optimistic copy", async () => {
    mockedPost.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useSendMessage(), { wrapper: Wrapper });
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID, content: "answering", replyToId: 42 });
    });
    await waitFor(() => {
      const sent = client
        .getQueryData<InfiniteData<MessagesPage>>(messagesKey)
        ?.pages.flatMap((page) => page.messages)
        .find((m) => m.content === "answering");
      expect(sent?.replyTo?.id).toBe(42);
      expect(sent?.replyTo?.content).toBe("message 42");
    });
  });
});

describe("saving a message that only exists in a context window", () => {
  it("adds it to Saved at once, because the optimistic lookup searches context windows as well as timelines", async () => {
    const savedKey = collaborationQueryKeys.chat.savedMessages();
    client.setQueryData<InfiniteData<SavedMessagesPage>>(savedKey, {
      pages: [{ items: [], nextCursor: null }],
      pageParams: [undefined],
    });
    mockedPost.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useSaveMessage(), { wrapper: Wrapper });
    act(() => {
      result.current.mutate(TARGET_ID);
    });
    await waitFor(() => {
      const items = client.getQueryData<InfiniteData<SavedMessagesPage>>(savedKey)?.pages[0]?.items;
      expect(items?.map((item) => item.messageId)).toEqual([TARGET_ID]);
    });
  });
});
