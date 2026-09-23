import { resolveProjectsStatValue } from "./command-center-page";

describe("resolveProjectsStatValue", () => {
  it("returns the exact count when hasMore is false because no further results exist beyond what loaded", () => {
    expect(resolveProjectsStatValue(7, false)).toBe(7);
  });

  it("returns 0 as the exact count when there are no projects and hasMore is false", () => {
    expect(resolveProjectsStatValue(0, false)).toBe(0);
  });

  it("returns the exact count when hasMore is false even if count equals the default page size because absence of hasMore proves the full set loaded", () => {
    expect(resolveProjectsStatValue(9, false)).toBe(9);
  });

  it("returns a plus-suffixed string when hasMore is true because the page size must not be asserted as the total count of active projects", () => {
    expect(resolveProjectsStatValue(9, true)).toBe("9+");
  });

  it("returns a plus-suffixed string for any page size when hasMore is true, not just the default 9", () => {
    expect(resolveProjectsStatValue(5, true)).toBe("5+");
  });

  it("returns the string type not the number type when hasMore is true so the caller can distinguish the two display modes", () => {
    expect(typeof resolveProjectsStatValue(9, true)).toBe("string");
    expect(typeof resolveProjectsStatValue(9, false)).toBe("number");
  });
});
