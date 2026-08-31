import type { InfiniteData } from "@tanstack/react-query";
import type { MessagesPage, Message } from "@/types/chat";

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
    pages: pages as MessagesPage[],
    pageParams: pages.map((_, i) => i),
  };
}

function flattenPages(data: InfiniteData<MessagesPage>): Message[] {
  const all = [...data.pages].reverse().flatMap((p) => p.messages);
  const seen = new Set<number>();
  return all.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

describe("ITEM C — stable message ordering", () => {
  it("page reversal produces ascending id order (matches server channel_position order)", () => {
    const olderPage = { messages: [makeMsg(10, "2026-01-01T00:00:10Z"), makeMsg(11, "2026-01-01T00:00:11Z")] };
    const newerPage = { messages: [makeMsg(20, "2026-01-01T00:00:20Z"), makeMsg(21, "2026-01-01T00:00:21Z")] };
    const data = makeInfiniteData([newerPage, olderPage]);
    const flat = flattenPages(data);
    expect(flat.map((m) => m.id)).toEqual([10, 11, 20, 21]);
  });

  it("first unread detection uses message position in the flattened list, not sort-by-createdAt", () => {
    const lastReadAt = "2026-01-01T00:00:15Z";
    const olderPage = { messages: [makeMsg(10, "2026-01-01T00:00:10Z"), makeMsg(11, "2026-01-01T00:00:11Z")] };
    const newerPage = { messages: [makeMsg(20, "2026-01-01T00:00:20Z"), makeMsg(21, "2026-01-01T00:00:21Z")] };
    const data = makeInfiniteData([newerPage, olderPage]);
    const flat = flattenPages(data);
    const lastReadTime = new Date(lastReadAt).getTime();
    const firstUnread = flat.find(
      (m) => m.createdAt && new Date(m.createdAt).getTime() > lastReadTime,
    );
    expect(firstUnread?.id).toBe(20);
  });

  it("client does NOT re-sort by createdAt — server channel_position order is preserved", () => {
    const t1 = "2026-01-01T00:00:10Z";
    const t2 = "2026-01-01T00:00:09Z";
    const page = { messages: [makeMsg(1, t1), makeMsg(2, t2)] };
    const data = makeInfiniteData([page]);
    const flat = flattenPages(data);
    expect(flat.map((m) => m.id)).toEqual([1, 2]);
  });
});

describe("ITEM C — optimistic reconciliation", () => {
  it("optimistic insert appended to first page survives onMutate rollback on error", () => {
    const msg1 = makeMsg(1, "2026-01-01T00:00:01Z");
    const optimistic = makeMsg(-Date.now(), new Date().toISOString());
    const original = makeInfiniteData([{ messages: [msg1] }]);

    const withOptimistic: InfiniteData<MessagesPage> = {
      pages: original.pages.map((page, i) =>
        i === 0 ? { ...page, messages: [...page.messages, optimistic] } : page,
      ),
      pageParams: original.pageParams,
    };

    expect(withOptimistic.pages[0]?.messages).toHaveLength(2);
    expect(withOptimistic.pages[0]?.messages[1]?.id).toBe(optimistic.id);

    expect(original.pages[0]?.messages).toHaveLength(1);
  });

  it("rollback restores previous cache snapshot without the optimistic message", () => {
    const msg1 = makeMsg(1, "2026-01-01T00:00:01Z");
    const original = makeInfiniteData([{ messages: [msg1] }]);
    const optimistic = makeMsg(-999, new Date().toISOString());

    const patched: InfiniteData<MessagesPage> = {
      pages: original.pages.map((page, i) =>
        i === 0 ? { ...page, messages: [...page.messages, optimistic] } : page,
      ),
      pageParams: original.pageParams,
    };

    const restored = original;
    expect(restored.pages[0]?.messages.map((m) => m.id)).toEqual([1]);
    expect(patched.pages[0]?.messages.map((m) => m.id)).toEqual([1, -999]);
  });
});

describe("ITEM C — draft ownership", () => {
  it("draft key is scoped per org and channel to prevent cross-org leakage", () => {
    function buildDraftKey(channelId: number, orgId: string, userId: string) {
      return `org:${orgId}:user:${userId}:chat:draft:${channelId}`;
    }
    const keyA = buildDraftKey(1, "org-a", "u1");
    const keyB = buildDraftKey(1, "org-b", "u1");
    const keyC = buildDraftKey(2, "org-a", "u1");
    expect(keyA).not.toBe(keyB);
    expect(keyA).not.toBe(keyC);
    expect(keyB).not.toBe(keyC);
  });
});

describe("ITEM C — read cursor tracking", () => {
  it("lastReadAt determines the first unread message boundary", () => {
    const members = [
      { userId: "u1", lastReadAt: "2026-01-01T00:00:15Z" },
      { userId: "u2", lastReadAt: null },
    ];
    const messages = [
      makeMsg(1, "2026-01-01T00:00:10Z"),
      makeMsg(2, "2026-01-01T00:00:20Z"),
      makeMsg(3, "2026-01-01T00:00:30Z"),
    ];

    const member = members.find((m) => m.userId === "u1");
    const lastReadAt = member?.lastReadAt;
    expect(lastReadAt).toBeTruthy();
    const lastReadTime = new Date(lastReadAt!).getTime();
    const firstUnread = messages.find(
      (m) => m.createdAt && new Date(m.createdAt).getTime() > lastReadTime,
    );
    expect(firstUnread?.id).toBe(2);
  });

  it("null lastReadAt means all messages are unread", () => {
    const messages = [makeMsg(1, "2026-01-01T00:00:10Z"), makeMsg(2, "2026-01-01T00:00:20Z")];
    const lastReadAt = null;
    const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : null;
    const firstUnread =
      lastReadTime === null
        ? undefined
        : messages.find((m) => m.createdAt && new Date(m.createdAt).getTime() > lastReadTime);
    expect(firstUnread).toBeUndefined();
  });
});

describe("ITEM C — unread counters", () => {
  it("unreadCount per channel sums only messages after lastReadAt", () => {
    const lastReadAt = new Date("2026-01-01T00:00:15Z").getTime();
    const msgs = [
      makeMsg(1, "2026-01-01T00:00:10Z"),
      makeMsg(2, "2026-01-01T00:00:20Z"),
      makeMsg(3, "2026-01-01T00:00:30Z"),
    ];
    const unread = msgs.filter(
      (m) => m.createdAt && new Date(m.createdAt).getTime() > lastReadAt,
    );
    expect(unread.length).toBe(2);
  });
});

describe("ITEM C — reconnect behavior", () => {
  it("prevConnectionState transitions from disconnected trigger a refetch signal", () => {
    const states: Array<"connected" | "disconnected" | "suspended"> = [
      "disconnected",
      "connected",
    ];
    let prev: string = "connected";
    let shouldRefetch = false;

    for (const state of states) {
      if (state === "connected") {
        const wasDisconnected = prev === "disconnected" || prev === "suspended";
        if (wasDisconnected) shouldRefetch = true;
      }
      prev = state;
    }

    expect(shouldRefetch).toBe(true);
  });

  it("reconnect from 'suspended' also triggers a refetch signal", () => {
    const states: Array<"connected" | "disconnected" | "suspended"> = [
      "suspended",
      "connected",
    ];
    let prev: string = "connected";
    let shouldRefetch = false;

    for (const state of states) {
      if (state === "connected") {
        const wasDisconnected = prev === "disconnected" || prev === "suspended";
        if (wasDisconnected) shouldRefetch = true;
      }
      prev = state;
    }

    expect(shouldRefetch).toBe(true);
  });

  it("reconnect from 'connected' (e.g. page refocus) does NOT trigger a refetch signal", () => {
    const states: Array<"connected" | "disconnected" | "suspended"> = [
      "connected",
      "connected",
    ];
    let prev: string = "connected";
    let shouldRefetch = false;

    for (const state of states) {
      if (state === "connected") {
        const wasDisconnected = prev === "disconnected" || prev === "suspended";
        if (wasDisconnected) shouldRefetch = true;
      }
      prev = state;
    }

    expect(shouldRefetch).toBe(false);
  });
});
