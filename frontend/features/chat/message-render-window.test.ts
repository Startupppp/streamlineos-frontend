import {
  MESSAGE_RENDER_PAGE_SIZE,
  resolveMessageWindowStart,
} from "./message-render-window";

describe("resolveMessageWindowStart — the mounted message count is bounded", () => {
  it("renders the whole history while it fits inside one page", () => {
    expect(resolveMessageWindowStart(40, 1, -1)).toBe(0);
    expect(resolveMessageWindowStart(MESSAGE_RENDER_PAGE_SIZE, 1, -1)).toBe(0);
  });

  it("keeps the newest page and holds the rest back", () => {
    expect(resolveMessageWindowStart(10_000, 1, -1)).toBe(
      10_000 - MESSAGE_RENDER_PAGE_SIZE,
    );
  });

  it("widens by exactly one page per reveal, with no gap between reveals", () => {
    const first = resolveMessageWindowStart(10_000, 1, -1);
    const second = resolveMessageWindowStart(10_000, 2, -1);
    const third = resolveMessageWindowStart(10_000, 3, -1);
    expect(first - second).toBe(MESSAGE_RENDER_PAGE_SIZE);
    expect(second - third).toBe(MESSAGE_RENDER_PAGE_SIZE);
  });

  it("reaches the very first message rather than overshooting past it", () => {
    expect(resolveMessageWindowStart(100, 2, -1)).toBe(0);
  });
});

describe("resolveMessageWindowStart — the unread divider is never windowed away", () => {
  it("reaches back to an unread message older than the tail window", () => {
    expect(resolveMessageWindowStart(10_000, 1, 12)).toBe(12);
  });

  it("does not narrow the window for an unread message already inside it", () => {
    const tailStart = 10_000 - MESSAGE_RENDER_PAGE_SIZE;
    expect(resolveMessageWindowStart(10_000, 1, tailStart + 5)).toBe(tailStart);
  });

  it("ignores a channel with nothing unread", () => {
    expect(resolveMessageWindowStart(10_000, 1, -1)).toBe(
      10_000 - MESSAGE_RENDER_PAGE_SIZE,
    );
  });

  it("keeps the first message visible when everything is unread", () => {
    expect(resolveMessageWindowStart(10_000, 1, 0)).toBe(0);
  });
});

describe("resolveMessageWindowStart — no message is skipped or shown twice", () => {
  it("covers every index exactly once as the window widens", () => {
    const total = 500;
    const seen = new Set<number>();
    for (let pages = 1; pages <= Math.ceil(total / MESSAGE_RENDER_PAGE_SIZE); pages += 1) {
      const start = resolveMessageWindowStart(total, pages, -1);
      for (let i = start; i < total; i += 1) seen.add(i);
    }
    expect(seen.size).toBe(total);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(total - 1);
  });

  it("never starts before the first message", () => {
    for (let pages = 1; pages <= 50; pages += 1)
      expect(resolveMessageWindowStart(30, pages, -1)).toBe(0);
  });
});
