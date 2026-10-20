import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import type { Channel, ChannelPage, Message, MessagesPage, ThreadPage } from "@/types/chat";

export const CHANNEL_ID = 7;
export const messagesKey = collaborationQueryKeys.chat.messages(CHANNEL_ID);
export const threadKey = collaborationQueryKeys.chat.thread(CHANNEL_ID, 1);
export const pinsKey = collaborationQueryKeys.chat.pins(CHANNEL_ID);
export const savedKey = collaborationQueryKeys.chat.savedMessages();
export const myChannelsKey = collaborationQueryKeys.chat.myChannels();
export const unreadKey = collaborationQueryKeys.chat.unreadTotal();
export const detailKey = collaborationQueryKeys.chat.channel(CHANNEL_ID);

export function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function freshClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

export function wrapperFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

export function message(over: Partial<Message> = {}): Message {
  return {
    id: 1,
    channelId: CHANNEL_ID,
    senderId: "user-2",
    content: "hi",
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    reactions: {},
    createdAt: "2026-09-30T10:00:00.000Z",
    updatedAt: "2026-09-30T10:00:00.000Z",
    sender: { id: "user-2", name: "Bo", image: null },
    attachments: [],
    replyTo: null,
    ...over,
  };
}

export function channelRow(over: Partial<Channel> = {}): Channel {
  return {
    id: CHANNEL_ID,
    name: "general",
    type: "PUBLIC",
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    members: [],
    memberCount: 2,
    membersTruncated: false,
    unreadCount: 0,
    lastMessage: null,
    ...over,
  };
}

export function detail(over: Partial<ChatChannelDetailWire> = {}): ChatChannelDetailWire {
  return {
    id: CHANNEL_ID,
    orgId: "org-1",
    name: "general",
    description: null,
    type: "PUBLIC",
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    isPinned: false,
    isPrivate: false,
    messageCount: 2,
    lastMessageAt: "2026-09-30T10:00:00.000Z",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    members: [
      {
        id: 11,
        channelId: CHANNEL_ID,
        userId: "user-1",
        role: "MEMBER",
        mutedUntil: null,
        isFavorite: false,
        notificationPreference: "DEFAULT",
        lastReadAt: "2026-09-30T09:00:00.000Z",
        joinedAt: "2026-09-01T10:00:00.000Z",
        archivedAt: null,
        user: { id: "user-1", name: "Ada", image: null, email: "ada@example.com" },
      },
    ],
    ...over,
  };
}

export function seedTimeline(client: QueryClient, messages: Message[]) {
  const data: InfiniteData<MessagesPage> = { pages: [{ messages, nextCursor: null }], pageParams: [undefined] };
  client.setQueryData(messagesKey, data);
}

export function seedChannels(client: QueryClient, channels: Channel[]) {
  const data: InfiniteData<ChannelPage<Channel>> = { pages: [{ channels, nextCursor: null }], pageParams: [null] };
  client.setQueryData(myChannelsKey, data);
}

export function timeline(client: QueryClient): Message[] {
  return client.getQueryData<InfiniteData<MessagesPage>>(messagesKey)?.pages.flatMap((p) => p.messages) ?? [];
}

export function threadReplies(client: QueryClient): Message[] {
  return client.getQueryData<InfiniteData<ThreadPage>>(threadKey)?.pages.flatMap((p) => p.replies) ?? [];
}

export function channelRows(client: QueryClient): Channel[] {
  return client.getQueryData<InfiniteData<ChannelPage<Channel>>>(myChannelsKey)?.pages.flatMap((p) => p.channels) ?? [];
}

export function refetchingInvalidations(spy: jest.SpyInstance) {
  return spy.mock.calls.filter(([filters]) => filters?.refetchType !== "none");
}

export function installRandomUuid(): void {
  let nextUuid = 0;
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  beforeAll(() => {
    if (typeof globalThis.crypto?.randomUUID !== "function")
      Object.defineProperty(globalThis, "crypto", {
        writable: true,
        configurable: true,
        value: {
          ...globalThis.crypto,
          randomUUID: () => `00000000-0000-4000-8000-${String(++nextUuid).padStart(12, "0")}`,
        },
      });
  });
  afterAll(() => {
    if (original) Object.defineProperty(globalThis, "crypto", original);
  });
}
