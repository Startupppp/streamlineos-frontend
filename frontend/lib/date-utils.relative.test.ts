import { formatRelativeTime } from "./date-utils";

// The fallback beyond a week renders an INSTANT in the reader's own zone, which is
// what a timestamp means to them. Anchoring NOW at midday LOCAL rather than at
// midday UTC keeps the assertion honest about that: a UTC anchor asserts the UTC
// reading and only passes on a UTC runner, which is the blind spot d01b3c41 found.
const NOW = new Date(2026, 7, 24, 12, 0, 0, 0);
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe("formatRelativeTime", () => {
  it("says just now under three quarters of a minute", () => {
    expect(formatRelativeTime(ago(5_000), NOW)).toBe("just now");
    expect(formatRelativeTime(ago(44_000), NOW)).toBe("just now");
  });

  it("counts minutes, hours and days", () => {
    expect(formatRelativeTime(ago(5 * 60_000), NOW)).toBe("5 minutes ago");
    expect(formatRelativeTime(ago(2 * 3_600_000), NOW)).toBe("2 hours ago");
    expect(formatRelativeTime(ago(3 * 86_400_000), NOW)).toBe("3 days ago");
  });

  it("gets the singular right, which a naive plural rule does not", () => {
    expect(formatRelativeTime(ago(60_000), NOW)).toBe("1 minute ago");
    expect(formatRelativeTime(ago(86_400_000), NOW)).toBe("yesterday");
  });

  it("falls back to a date beyond a week", () => {
    // "43 days ago" is arithmetic the reader has to undo.
    expect(formatRelativeTime(ago(43 * 86_400_000), NOW)).toBe("12 Jul 2026");
  });

  it("handles a future timestamp without producing nonsense", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + 2 * 3_600_000), NOW)).toBe("in 2 hours");
  });

  it("returns empty for missing or unparseable input rather than Invalid Date", () => {
    expect(formatRelativeTime(null, NOW)).toBe("");
    expect(formatRelativeTime(undefined, NOW)).toBe("");
    expect(formatRelativeTime("not a date", NOW)).toBe("");
  });
});
