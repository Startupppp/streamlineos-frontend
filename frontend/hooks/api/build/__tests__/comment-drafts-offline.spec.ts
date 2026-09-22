import { bufferDraft, drainBuffer, peekBuffer, clearBuffer } from "../comment-draft-offline-buffer";

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: storageMock });

beforeEach(() => {
  storageMock.clear();
});

describe("comment-draft offline buffer — bufferDraft", () => {
  it("writes a draft body for a given ticketId", () => {
    bufferDraft(1, "hello");
    expect(peekBuffer()).toEqual([{ ticketId: 1, body: "hello" }]);
  });

  it("overwrites a previous draft for the same ticketId (last-write-wins)", () => {
    bufferDraft(1, "first draft");
    bufferDraft(1, "second draft");
    const pending = peekBuffer();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual({ ticketId: 1, body: "second draft" });
  });

  it("buffers multiple drafts for different tickets independently", () => {
    bufferDraft(1, "body one");
    bufferDraft(2, "body two");
    const pending = peekBuffer();
    expect(pending).toHaveLength(2);
    const ids = pending.map((p) => p.ticketId).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2]);
  });
});

describe("comment-draft offline buffer — drainBuffer", () => {
  it("returns all buffered drafts", () => {
    bufferDraft(5, "some text");
    const drained = drainBuffer();
    expect(drained).toHaveLength(1);
    expect(drained[0]).toEqual({ ticketId: 5, body: "some text" });
  });

  it("empties the buffer after draining", () => {
    bufferDraft(5, "some text");
    drainBuffer();
    expect(peekBuffer()).toHaveLength(0);
  });

  it("returns empty array when buffer is empty", () => {
    expect(drainBuffer()).toEqual([]);
  });

  it("only includes the latest body per ticket after multiple writes", () => {
    bufferDraft(3, "old body");
    bufferDraft(3, "new body");
    const drained = drainBuffer();
    expect(drained).toHaveLength(1);
    expect(drained[0]?.body).toBe("new body");
  });
});

describe("comment-draft offline buffer — clearBuffer", () => {
  it("removes all pending drafts without returning them", () => {
    bufferDraft(1, "a");
    bufferDraft(2, "b");
    clearBuffer();
    expect(peekBuffer()).toHaveLength(0);
  });
});

describe("comment-draft offline buffer — peekBuffer does not consume entries", () => {
  it("does not remove entries when reading via peekBuffer", () => {
    bufferDraft(10, "draft text");
    peekBuffer();
    expect(peekBuffer()).toHaveLength(1);
  });
});

describe("comment-draft offline buffer — storage errors are swallowed", () => {
  it("bufferDraft survives a throwing localStorage", () => {
    const getItem = jest.spyOn(storageMock, "setItem").mockImplementationOnce(() => {
      throw new Error("quota exceeded");
    });
    expect(() => bufferDraft(1, "text")).not.toThrow();
    getItem.mockRestore();
  });
});
