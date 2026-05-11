import { describe, expect, it } from "vitest";
import { leaveDaysOverlappingMonth } from "./leave-days-overlap";

describe("leaveDaysOverlappingMonth", () => {
  it("counts full overlap inside one month", () => {
    expect(leaveDaysOverlappingMonth("2026-02-01", "2026-02-05", "2026-02", false)).toBe(5);
  });

  it("returns 0.5 for single-day half-day leave", () => {
    expect(leaveDaysOverlappingMonth("2026-02-10", "2026-02-10", "2026-02", true)).toBe(0.5);
  });

  it("clamps to pay month when leave spans months", () => {
    expect(leaveDaysOverlappingMonth("2026-01-28", "2026-02-03", "2026-02", false)).toBe(3);
  });
});
