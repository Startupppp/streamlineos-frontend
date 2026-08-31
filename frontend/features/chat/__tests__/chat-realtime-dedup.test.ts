import type { InfiniteData } from "@tanstack/react-query";
import type { MessagesPage } from "@/types/chat";

type MsgRow = { id: number };

function dedupBySet(messages: MsgRow[]): MsgRow[] {
  const seen = new Set<number>();
  return messages.filter((msg) => {
    if (seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });
}

function ablyHandlerDedup(
  old: InfiniteData<MessagesPage>,
  incomingId: number,
): boolean {
  const allExisting = old.pages.flatMap((p) => p.messages);
  return allExisting.some((m) => m.id === incomingId);
}

function makeInfiniteData(pages: Array<{ messages: MsgRow[] }>): InfiniteData<MessagesPage> {
  return {
    pages: pages as MessagesPage[],
    pageParams: pages.map((_, i) => i),
  };
}

describe("chat message deduplication — render-time Set dedup", () => {
  it("passes through unique messages unchanged", () => {
    const messages: MsgRow[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(dedupBySet(messages)).toEqual(messages);
  });

  it("removes second occurrence of the same id", () => {
    const messages: MsgRow[] = [{ id: 1 }, { id: 2 }, { id: 1 }];
    const result = dedupBySet(messages);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it("keeps the first occurrence when duplicating across pages", () => {
    const pagesFlat: MsgRow[] = [
      { id: 10 },
      { id: 11 },
      { id: 12 },
      { id: 10 },
      { id: 13 },
    ];
    const result = dedupBySet(pagesFlat);
    expect(result.map((m) => m.id)).toEqual([10, 11, 12, 13]);
  });

  it("handles an empty list without error", () => {
    expect(dedupBySet([])).toEqual([]);
  });

  it("handles a single-element list", () => {
    expect(dedupBySet([{ id: 99 }])).toEqual([{ id: 99 }]);
  });
});

describe("chat message deduplication — Ably handler dedup", () => {
  it("returns true (duplicate) when id already exists in any page", () => {
    const data = makeInfiniteData([
      { messages: [{ id: 1 }, { id: 2 }] as MsgRow[] },
      { messages: [{ id: 3 }] as MsgRow[] },
    ]);
    expect(ablyHandlerDedup(data, 2)).toBe(true);
  });

  it("returns false (new) when id is not in any page", () => {
    const data = makeInfiniteData([
      { messages: [{ id: 1 }, { id: 2 }] as MsgRow[] },
    ]);
    expect(ablyHandlerDedup(data, 5)).toBe(false);
  });

  it("handles pages with no messages", () => {
    const data = makeInfiniteData([{ messages: [] }]);
    expect(ablyHandlerDedup(data, 1)).toBe(false);
  });

  it("detects duplicate in the first page when message arrives again via Ably", () => {
    const data = makeInfiniteData([
      { messages: [{ id: 100 }, { id: 101 }] as MsgRow[] },
    ]);
    expect(ablyHandlerDedup(data, 100)).toBe(true);
    expect(ablyHandlerDedup(data, 102)).toBe(false);
  });

  it("does not mutate the cache object (returns old on duplicate)", () => {
    const data = makeInfiniteData([{ messages: [{ id: 7 }] as MsgRow[] }]);
    const isDuplicate = ablyHandlerDedup(data, 7);
    expect(isDuplicate).toBe(true);
    expect(data.pages[0]?.messages).toHaveLength(1);
  });
});
