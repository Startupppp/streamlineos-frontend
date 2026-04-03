import { describe, it, expect } from "vitest";
import {
  encodeCursor,
  decodeCursor,
  buildCursorPage,
  type CursorPaginatedResponse,
} from "@/lib/cursor-pagination";

// cursor-pagination.ts has no "server-only" marker and uses only Node.js built-ins
// (Buffer + JSON), so no mocks are required.

describe("encodeCursor / decodeCursor round-trip", () => {
  it("round-trips a basic id + createdAt pair", () => {
    const date = new Date("2025-01-15T10:30:00.000Z");
    const encoded = encodeCursor(42, date);
    const decoded = decodeCursor(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe(42);
    expect(decoded!.createdAt.toISOString()).toBe(date.toISOString());
  });

  it("returns a non-empty base64url string", () => {
    const encoded = encodeCursor(1, new Date());
    // base64url characters: A-Z a-z 0-9 - _  (no + / =)
    expect(encoded).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("produces different cursors for different ids", () => {
    const date = new Date("2025-06-01T00:00:00.000Z");
    const c1 = encodeCursor(1, date);
    const c2 = encodeCursor(2, date);
    expect(c1).not.toBe(c2);
  });

  it("produces different cursors for the same id but different dates", () => {
    const c1 = encodeCursor(5, new Date("2025-01-01T00:00:00.000Z"));
    const c2 = encodeCursor(5, new Date("2025-06-01T00:00:00.000Z"));
    expect(c1).not.toBe(c2);
  });
});

describe("decodeCursor", () => {
  it("returns null for an empty string", () => {
    expect(decodeCursor("")).toBeNull();
  });

  it("returns null for random non-base64 input", () => {
    expect(decodeCursor("not-a-valid-cursor!!!")).toBeNull();
  });

  it("returns null for valid base64 that is not a JSON object", () => {
    const junk = Buffer.from("hello world").toString("base64url");
    expect(decodeCursor(junk)).toBeNull();
  });

  it("returns null when JSON has no id field", () => {
    const payload = Buffer.from(
      JSON.stringify({ createdAt: new Date().toISOString() })
    ).toString("base64url");
    expect(decodeCursor(payload)).toBeNull();
  });

  it("returns null when id is a string (not a number)", () => {
    const payload = Buffer.from(
      JSON.stringify({ id: "not-a-number", createdAt: new Date().toISOString() })
    ).toString("base64url");
    expect(decodeCursor(payload)).toBeNull();
  });

  it("returns null when createdAt is missing", () => {
    const payload = Buffer.from(JSON.stringify({ id: 1 })).toString("base64url");
    expect(decodeCursor(payload)).toBeNull();
  });
});

describe("buildCursorPage", () => {
  interface Item {
    id: number;
    createdAt: Date;
    name: string;
  }

  const makeItems = (count: number): Item[] =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      createdAt: new Date(`2025-0${(i % 9) + 1}-01T00:00:00.000Z`),
      name: `Item ${i + 1}`,
    }));

  const getCursor = (item: Item) => ({ id: item.id, createdAt: item.createdAt });

  it("returns hasMore=false and nextCursor=null when rows <= limit", () => {
    const items = makeItems(5);
    const result: CursorPaginatedResponse<Item> = buildCursorPage(items, 10, getCursor);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.items).toHaveLength(5);
  });

  it("returns hasMore=true and a valid nextCursor when rows > limit", () => {
    // Fetch limit+1 rows to detect there is a next page
    const items = makeItems(11); // limit is 10
    const result = buildCursorPage(items, 10, getCursor);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
    // items returned should be exactly limit (10), not limit+1
    expect(result.items).toHaveLength(10);
  });

  it("the nextCursor decodes to the last item's id and createdAt", () => {
    const items = makeItems(6); // limit = 5
    const result = buildCursorPage(items, 5, getCursor);
    expect(result.nextCursor).not.toBeNull();

    const decoded = decodeCursor(result.nextCursor!);
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe(items[4].id); // last item in the returned slice
    expect(decoded!.createdAt.toISOString()).toBe(items[4].createdAt.toISOString());
  });

  it("returns empty items with no cursor for an empty array", () => {
    const result = buildCursorPage([], 10, getCursor);
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});
