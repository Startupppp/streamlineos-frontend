import { describeDayColumn } from "./day-label";
import { resolveWeekStart } from "./use-week";

describe("resolveWeekStart", () => {
  it("uses the org setting when the viewer can read settings", () => {
    expect(resolveWeekStart(0, "2026-09-07")).toBe(0);
    expect(resolveWeekStart(6, "2026-09-07")).toBe(6);
  });

  it("falls back to the current period's start day when settings are unreadable", () => {
    expect(resolveWeekStart(undefined, "2026-09-06")).toBe(0);
    expect(resolveWeekStart(undefined, "2026-09-07")).toBe(1);
    expect(resolveWeekStart(null, "2026-09-09")).toBe(3);
  });

  it("prefers settings over the period when the two disagree", () => {
    expect(resolveWeekStart(6, "2026-09-07")).toBe(6);
  });

  it("falls back to Monday only when neither source has answered", () => {
    expect(resolveWeekStart(undefined, undefined)).toBe(1);
    expect(resolveWeekStart(null, null)).toBe(1);
  });

  it("ignores an out-of-range or non-integer setting rather than producing a bad week", () => {
    expect(resolveWeekStart(7, "2026-09-06")).toBe(0);
    expect(resolveWeekStart(-1, "2026-09-06")).toBe(0);
    expect(resolveWeekStart(1.5, "2026-09-06")).toBe(0);
  });

  it("ignores an unparseable period start", () => {
    expect(resolveWeekStart(undefined, "not-a-date")).toBe(1);
  });
});

describe("describeDayColumn", () => {
  it("names the day for a screen reader", () => {
    expect(describeDayColumn("2026-09-09", undefined)).toBe("Wednesday 9 September");
  });

  it("announces the holiday that the background tint is the only other carrier of", () => {
    expect(describeDayColumn("2026-09-09", "Onam")).toBe(
      "Wednesday 9 September, company holiday: Onam",
    );
  });
});
