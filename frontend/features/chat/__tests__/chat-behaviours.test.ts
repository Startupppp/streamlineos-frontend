import type { InfiniteData } from "@tanstack/react-query";
import type { ChannelMember, Message, MessagesPage } from "@/types/chat";
import { orgScopedStorageKey, UNSCOPED } from "@/lib/org-scoped-storage";
import { reconnectShouldResync } from "@/hooks/api/chat-realtime";
import {
  flattenMessagePages,
  mergeInboundMessage,
} from "../message-page-merge";
import {
  chatChannelReadEnabled,
  resolveFirstUnreadIndex,
} from "../chat-read-position";

function makeMsg(id: number, createdAt: string): Message {
  return {
    id,
    channelId: 1,
    senderId: "u1",
    content: `msg ${id}`,
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    createdAt,
    updatedAt: createdAt,
    sender: { id: "u1", name: "Alice", image: null },
    attachments: [],
    replyTo: null,
  };
}

function makeInfiniteData(
  pages: Array<{ messages: Message[] }>,
): InfiniteData<MessagesPage> {
  return {
    pages: pages.map((page) => ({ ...page, nextCursor: null })) as MessagesPage[],
    pageParams: pages.map((_, index) => index),
  };
}

function memberWithLastRead(
  userId: string,
  lastReadAt: string | null,
): ChannelMember {
  return {
    id: 1,
    channelId: 1,
    userId,
    role: "MEMBER",
    lastReadAt,
    mutedUntil: null,
    isFavorite: false,
    notificationPreference: "DEFAULT",
    user: { id: userId, name: "Alice", image: null },
  };
}

describe("ITEM C — stable message ordering", () => {
  it("page reversal produces ascending id order, matching the server's channel_position order", () => {
    const data = makeInfiniteData([
      { messages: [makeMsg(12, "2026-01-01T00:00:12Z")] },
      {
        messages: [
          makeMsg(10, "2026-01-01T00:00:10Z"),
          makeMsg(11, "2026-01-01T00:00:11Z"),
        ],
      },
    ]);

    expect(flattenMessagePages(data).map((m) => m.id)).toEqual([10, 11, 12]);
  });

  it("a message present in two pages is rendered once", () => {
    const data = makeInfiniteData([
      { messages: [makeMsg(3, "2026-01-01T00:00:03Z")] },
      {
        messages: [
          makeMsg(2, "2026-01-01T00:00:02Z"),
          makeMsg(3, "2026-01-01T00:00:03Z"),
        ],
      },
    ]);

    expect(flattenMessagePages(data).map((m) => m.id)).toEqual([2, 3]);
  });
});

describe("ITEM C — optimistic reconciliation", () => {
  it("the server echo replaces the optimistic row rather than appending beside it", () => {
    const optimistic: Message = {
      ...makeMsg(-999, "2026-01-01T00:00:20Z"),
      clientKey: "draft-1",
    };
    const data = makeInfiniteData([
      { messages: [makeMsg(1, "2026-01-01T00:00:10Z"), optimistic] },
    ]);

    const merged = mergeInboundMessage(
      data,
      makeMsg(500, "2026-01-01T00:00:20Z"),
      "draft-1",
    );

    expect(flattenMessagePages(merged).map((m) => m.id)).toEqual([1, 500]);
  });

  it("an echo with no matching clientKey appends, so a stranger's message is never swallowed", () => {
    const optimistic: Message = {
      ...makeMsg(-999, "2026-01-01T00:00:20Z"),
      clientKey: "draft-1",
    };
    const data = makeInfiniteData([{ messages: [optimistic] }]);

    const merged = mergeInboundMessage(
      data,
      makeMsg(500, "2026-01-01T00:00:21Z"),
      "draft-2",
    );

    expect(flattenMessagePages(merged).map((m) => m.id)).toEqual([-999, 500]);
  });
});

describe("ITEM C — draft ownership", () => {
  it("the draft key is scoped per org and per user, so a draft cannot leak across tenants", () => {
    const keyOrgA = orgScopedStorageKey("chat:draft:1", "org-a:u1");
    const keyOrgB = orgScopedStorageKey("chat:draft:1", "org-b:u1");
    const keyOtherUser = orgScopedStorageKey("chat:draft:1", "org-a:u2");

    expect(keyOrgA).not.toBe(keyOrgB);
    expect(keyOrgA).not.toBe(keyOtherUser);
  });

  it("the draft key is scoped per channel", () => {
    expect(orgScopedStorageKey("chat:draft:1", "org-a:u1")).not.toBe(
      orgScopedStorageKey("chat:draft:2", "org-a:u1"),
    );
  });

  it("an unscoped key is still distinct from a scoped one, so a signed-out draft cannot be read back as a tenant's", () => {
    expect(orgScopedStorageKey("chat:draft:1", UNSCOPED)).not.toBe(
      orgScopedStorageKey("chat:draft:1", "org-a:u1"),
    );
  });
});

describe("ITEM C — read cursor tracking", () => {
  const messages = [
    makeMsg(1, "2026-01-01T00:00:10Z"),
    makeMsg(2, "2026-01-01T00:00:20Z"),
    makeMsg(3, "2026-01-01T00:00:30Z"),
  ];

  it("lastReadAt determines the first unread message boundary", () => {
    const index = resolveFirstUnreadIndex(
      messages,
      [memberWithLastRead("u1", "2026-01-01T00:00:15Z")],
      "u1",
    );

    expect(messages[index]?.id).toBe(2);
  });

  it("a null lastReadAt reports no unread boundary, so no divider is drawn", () => {
    expect(
      resolveFirstUnreadIndex(messages, [memberWithLastRead("u1", null)], "u1"),
    ).toBe(-1);
  });

  it("reports no boundary when the viewer has read everything", () => {
    expect(
      resolveFirstUnreadIndex(
        messages,
        [memberWithLastRead("u1", "2026-01-01T01:00:00Z")],
        "u1",
      ),
    ).toBe(-1);
  });

  it("reads the viewer's own row, not another member's cursor", () => {
    const index = resolveFirstUnreadIndex(
      messages,
      [
        memberWithLastRead("u2", "2026-01-01T00:00:25Z"),
        memberWithLastRead("u1", "2026-01-01T00:00:15Z"),
      ],
      "u1",
    );

    expect(messages[index]?.id).toBe(2);
  });

  it("reports no boundary when the viewer is not a member of the channel", () => {
    expect(
      resolveFirstUnreadIndex(
        messages,
        [memberWithLastRead("u2", "2026-01-01T00:00:15Z")],
        "u1",
      ),
    ).toBe(-1);
  });
});

describe("ITEM C — reconnect behavior", () => {
  it("a reconnect from disconnected resyncs the history", () => {
    expect(reconnectShouldResync("disconnected")).toBe(true);
  });

  it("a reconnect from suspended also resyncs", () => {
    expect(reconnectShouldResync("suspended")).toBe(true);
  });

  it("a connected-to-connected transition does not resync, so a refocus is not a refetch", () => {
    expect(reconnectShouldResync("connected")).toBe(false);
  });

  it("the initialising and connecting states do not resync either", () => {
    expect(reconnectShouldResync("initialized")).toBe(false);
    expect(reconnectShouldResync("connecting")).toBe(false);
  });
});

describe("ITEM C — channel/thread access suppression", () => {
  it("the read is not enabled without permission", () => {
    expect(chatChannelReadEnabled(false, 42)).toBe(false);
  });

  it("the read is not enabled for a placeholder channel id", () => {
    expect(chatChannelReadEnabled(true, 0)).toBe(false);
    expect(chatChannelReadEnabled(true, -1)).toBe(false);
  });

  it("the read is enabled only with permission and a real channel", () => {
    expect(chatChannelReadEnabled(true, 1)).toBe(true);
    expect(chatChannelReadEnabled(true, 42)).toBe(true);
  });

  it("covers every gate combination", () => {
    const cases: Array<[boolean, number, boolean]> = [
      [false, 0, false],
      [false, 42, false],
      [true, 0, false],
      [true, -1, false],
      [true, 1, true],
      [true, 99, true],
    ];

    for (const [canRead, channelId, expected] of cases)
      expect(chatChannelReadEnabled(canRead, channelId)).toBe(expected);
  });
});
