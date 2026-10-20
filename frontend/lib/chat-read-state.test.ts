import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import {
  applyOptimisticUnread,
  invalidateChatReconnect,
  patchOwnMember,
  patchUnreadTotal,
} from "@/lib/chat-read-state";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import type { Channel, ChannelPage } from "@/types/chat";

const EDITED_CHANNEL = 1;
const OTHER_CHANNEL = 2;

type Probe =
  | "editedMessages"
  | "otherMessages"
  | "editedPins"
  | "savedMessages"
  | "myChannels"
  | "unreadTotal"
  | "editedThread"
  | "otherThread";

const PROBES: Record<Probe, readonly unknown[]> = {
  editedMessages: collaborationQueryKeys.chat.messages(EDITED_CHANNEL),
  otherMessages: collaborationQueryKeys.chat.messages(OTHER_CHANNEL),
  editedPins: collaborationQueryKeys.chat.pins(EDITED_CHANNEL),
  savedMessages: collaborationQueryKeys.chat.savedMessages(),
  myChannels: collaborationQueryKeys.chat.myChannels(),
  unreadTotal: collaborationQueryKeys.chat.unreadTotal(),
  editedThread: collaborationQueryKeys.chat.thread(EDITED_CHANNEL, 55),
  otherThread: collaborationQueryKeys.chat.thread(OTHER_CHANNEL, 99),
};

function freshClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function primedClient(): QueryClient {
  const client = freshClient();
  for (const key of Object.values(PROBES)) client.setQueryData(key, { seeded: true });
  return client;
}

function invalidated(client: QueryClient): Probe[] {
  return (Object.keys(PROBES) as Probe[]).filter(
    (name) => client.getQueryState(PROBES[name])?.isInvalidated === true,
  );
}

const ownMember: Channel["members"][number] = {
  id: 11,
  channelId: EDITED_CHANNEL,
  userId: "user-1",
  role: "MEMBER",
  mutedUntil: null,
  isFavorite: false,
  notificationPreference: "DEFAULT",
  user: { id: "user-1", name: "Ada", image: null },
};

function row(over: Partial<Channel> = {}): Channel {
  return {
    id: EDITED_CHANNEL,
    name: "general",
    type: "PUBLIC",
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    members: [ownMember],
    memberCount: 2,
    membersTruncated: false,
    unreadCount: 0,
    lastMessage: { content: "hi", senderName: "Bo", createdAt: "2026-09-30T10:00:00.000Z" },
    ...over,
  };
}

function seedRows(client: QueryClient, channels: Channel[]) {
  const data: InfiniteData<ChannelPage<Channel>> = { pages: [{ channels, nextCursor: null }], pageParams: [null] };
  client.setQueryData(PROBES.myChannels, data);
}

function firstRow(client: QueryClient): Channel | undefined {
  return client.getQueryData<InfiniteData<ChannelPage<Channel>>>(PROBES.myChannels)?.pages[0].channels[0];
}

describe("invalidateChatReconnect — the one place chat still refetches, because events were missed", () => {
  it("refreshes the reconnected channel's messages and threads plus the unread state", () => {
    const client = primedClient();
    invalidateChatReconnect(client, EDITED_CHANNEL);
    expect(invalidated(client).sort()).toEqual(
      ["editedMessages", "editedThread", "myChannels", "unreadTotal"].sort(),
    );
  });

  it("leaves other channels, pins and saved messages alone", () => {
    const client = primedClient();
    invalidateChatReconnect(client, EDITED_CHANNEL);
    expect(invalidated(client)).not.toContain("otherMessages");
    expect(invalidated(client)).not.toContain("otherThread");
    expect(invalidated(client)).not.toContain("editedPins");
    expect(invalidated(client)).not.toContain("savedMessages");
  });
});

describe("patchUnreadTotal", () => {
  it("never goes below zero or above the server's cap of 100", () => {
    const client = freshClient();
    client.setQueryData(PROBES.unreadTotal, { total: 99 });
    patchUnreadTotal(client, (total) => total + 5);
    expect(client.getQueryData(PROBES.unreadTotal)).toEqual({ total: 100 });
    patchUnreadTotal(client, (total) => total - 500);
    expect(client.getQueryData(PROBES.unreadTotal)).toEqual({ total: 0 });
  });

  it("rolls back to the previous total when nothing else moved it", () => {
    const client = freshClient();
    client.setQueryData(PROBES.unreadTotal, { total: 4 });
    const rollback = patchUnreadTotal(client, (total) => total - 4);
    rollback();
    expect(client.getQueryData(PROBES.unreadTotal)).toEqual({ total: 4 });
  });

  it("does not invent a total for a cache that was never loaded", () => {
    const client = freshClient();
    patchUnreadTotal(client, (total) => total + 1);
    expect(client.getQueryData(PROBES.unreadTotal)).toBeUndefined();
  });
});

describe("patchOwnMember", () => {
  it("patches only the viewer's membership in both the list row and the channel detail, and rolls both back", () => {
    const client = freshClient();
    const other = { ...ownMember, id: 12, userId: "user-2", user: { id: "user-2", name: "Bo", image: null } };
    seedRows(client, [row({ members: [ownMember, other] })]);
    const detail: Pick<ChatChannelDetailWire, "id" | "members"> = {
      id: EDITED_CHANNEL,
      members: [
        { ...ownMember, lastReadAt: null, joinedAt: "2026-09-01T00:00:00.000Z", archivedAt: null, user: { id: "user-1", name: "Ada", image: null, email: "a@x" } },
      ],
    };
    client.setQueryData(collaborationQueryKeys.chat.channel(EDITED_CHANNEL), detail);
    const rollback = patchOwnMember(client, EDITED_CHANNEL, "user-1", { isFavorite: true, archivedAt: "2026-10-01T00:00:00.000Z" });
    expect(firstRow(client)?.members.map((m) => m.isFavorite)).toEqual([true, false]);
    const patched = client.getQueryData<ChatChannelDetailWire>(collaborationQueryKeys.chat.channel(EDITED_CHANNEL));
    expect(patched?.members[0]).toEqual(expect.objectContaining({ isFavorite: true, archivedAt: "2026-10-01T00:00:00.000Z" }));
    rollback();
    expect(firstRow(client)?.members.map((m) => m.isFavorite)).toEqual([false, false]);
    expect(
      client.getQueryData<ChatChannelDetailWire>(collaborationQueryKeys.chat.channel(EDITED_CHANNEL))?.members[0].isFavorite,
    ).toBe(false);
  });
});

describe("applyOptimisticUnread", () => {
  it("marks a read channel with a last message as one unread and raises the total", () => {
    const client = freshClient();
    seedRows(client, [row()]);
    client.setQueryData(PROBES.unreadTotal, { total: 0 });
    const rollback = applyOptimisticUnread(client, EDITED_CHANNEL);
    expect(firstRow(client)?.unreadCount).toBe(1);
    expect(client.getQueryData(PROBES.unreadTotal)).toEqual({ total: 1 });
    rollback();
    expect(firstRow(client)?.unreadCount).toBe(0);
    expect(client.getQueryData(PROBES.unreadTotal)).toEqual({ total: 0 });
  });

  it("leaves a channel that is already unread, or empty, untouched", () => {
    const client = freshClient();
    seedRows(client, [row({ unreadCount: 3 })]);
    applyOptimisticUnread(client, EDITED_CHANNEL);
    expect(firstRow(client)?.unreadCount).toBe(3);
    seedRows(client, [row({ lastMessage: null })]);
    applyOptimisticUnread(client, EDITED_CHANNEL);
    expect(firstRow(client)?.unreadCount).toBe(0);
  });
});
