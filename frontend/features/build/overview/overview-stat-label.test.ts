import { resolveOverviewStatLabel } from "./overview-stat-label";

describe("resolveOverviewStatLabel", () => {
  it("returns the exact count when hasMore is false because the full set loaded", () => {
    expect(resolveOverviewStatLabel(7, false)).toBe(7);
  });

  it("returns zero as the exact count when there are no items and hasMore is false", () => {
    expect(resolveOverviewStatLabel(0, false)).toBe(0);
  });

  it("returns a plus-suffixed string when hasMore is true because the page size must not be asserted as the total", () => {
    expect(resolveOverviewStatLabel(10, true)).toBe("10+");
  });

  it("returns a plus-suffixed string for any count when hasMore is true, not just the default page size", () => {
    expect(resolveOverviewStatLabel(3, true)).toBe("3+");
  });

  it("returns the number type when hasMore is false so callers can distinguish display modes", () => {
    expect(typeof resolveOverviewStatLabel(5, false)).toBe("number");
  });

  it("returns the string type when hasMore is true so callers can distinguish display modes", () => {
    expect(typeof resolveOverviewStatLabel(5, true)).toBe("string");
  });
});
