import type { InfiniteData } from "@tanstack/react-query";
import type { Message, MessagesPage } from "@/types/chat";
import {
  flattenMessagePages,
  mergeInboundMessage,
} from "../message-page-merge";

function makeMsg(id: number, overrides: Partial<Message> = {}): Message {
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
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    sender: { id: "u1", name: "Alice", image: null },
    attachments: [],
    replyTo: null,
    ...overrides,
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

function idsIn(data: InfiniteData<MessagesPage>): number[] {
  return data.pages.flatMap((page) => page.messages.map((m) => m.id));
}

describe("flattenMessagePages — the render-time dedup the panel actually uses", () => {
  it("drops a message that appears in two pages", () => {
    const data = makeInfiniteData([
      { messages: [makeMsg(3)] },
      { messages: [makeMsg(1), makeMsg(2), makeMsg(3)] },
    ]);

    expect(flattenMessagePages(data).map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it("returns pages oldest-first, because the server sends newest page first", () => {
    const data = makeInfiniteData([
      { messages: [makeMsg(10), makeMsg(11)] },
      { messages: [makeMsg(8), makeMsg(9)] },
    ]);

    expect(flattenMessagePages(data).map((m) => m.id)).toEqual([8, 9, 10, 11]);
  });

  it("keeps the first copy of a duplicate, so the older page's row wins", () => {
    const data = makeInfiniteData([
      { messages: [makeMsg(5, { content: "newer copy" })] },
      { messages: [makeMsg(5, { content: "older copy" })] },
    ]);

    expect(flattenMessagePages(data)[0]?.content).toBe("older copy");
  });

  it("returns an empty list for an unloaded cache rather than throwing", () => {
    expect(flattenMessagePages(undefined)).toEqual([]);
  });
});

describe("mergeInboundMessage — the realtime handler's dedup", () => {
  it("appends a genuinely new message to the newest page", () => {
    const data = makeInfiniteData([{ messages: [makeMsg(1)] }]);

    expect(idsIn(mergeInboundMessage(data, makeMsg(2), null))).toEqual([1, 2]);
  });

  it("ignores a message already in the cache, so a replayed frame cannot duplicate it", () => {
    const data = makeInfiniteData([{ messages: [makeMsg(1), makeMsg(2)] }]);

    const merged = mergeInboundMessage(data, makeMsg(2), null);

    expect(idsIn(merged)).toEqual([1, 2]);
    expect(merged).toBe(data);
  });

  it("replaces our own optimistic copy in place instead of showing a second bubble", () => {
    const data = makeInfiniteData([
      { messages: [makeMsg(1), makeMsg(-1, { clientKey: "key-a" })] },
    ]);

    const merged = mergeInboundMessage(data, makeMsg(42), "key-a");

    expect(idsIn(merged)).toEqual([1, 42]);
  });

  it("appends rather than replacing when the clientKey does not match any optimistic row", () => {
    const data = makeInfiniteData([
      { messages: [makeMsg(-1, { clientKey: "key-a" })] },
    ]);

    expect(idsIn(mergeInboundMessage(data, makeMsg(42), "key-b"))).toEqual([
      -1, 42,
    ]);
  });

  it("never treats a persisted message as an optimistic copy, even on a clientKey match", () => {
    const data = makeInfiniteData([
      { messages: [makeMsg(7, { clientKey: "key-a" })] },
    ]);

    expect(idsIn(mergeInboundMessage(data, makeMsg(42), "key-a"))).toEqual([
      7, 42,
    ]);
  });

  it("appends when the frame carries no clientKey, so a blank key matches nothing", () => {
    const data = makeInfiniteData([
      { messages: [makeMsg(-1, { clientKey: "" })] },
    ]);

    expect(idsIn(mergeInboundMessage(data, makeMsg(42), ""))).toEqual([-1, 42]);
  });

  it("finds the optimistic copy on a later page too", () => {
    const data = makeInfiniteData([
      { messages: [makeMsg(1)] },
      { messages: [makeMsg(-9, { clientKey: "key-z" })] },
    ]);

    expect(idsIn(mergeInboundMessage(data, makeMsg(99), "key-z"))).toEqual([
      1, 99,
    ]);
  });
});
