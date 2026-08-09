import {
  DEFAULT_PAGE_SIZE,
  getLastPage,
  parsePage,
  parsePageSize,
  STANDARD_PAGE_SIZE_OPTIONS,
} from "./list-pagination";

describe("list pagination params", () => {
  it.each([
    [null, 1],
    ["", 1],
    ["0", 1],
    ["-2", 1],
    ["1.5", 1],
    ["not-a-number", 1],
    ["3", 3],
  ])("parses page %p as %i", (value, expected) => {
    expect(parsePage(value)).toBe(expected);
  });

  it("accepts only supported page sizes", () => {
    for (const size of STANDARD_PAGE_SIZE_OPTIONS) {
      expect(parsePageSize(String(size))).toBe(size);
    }

    expect(parsePageSize(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("25")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("not-a-number")).toBe(DEFAULT_PAGE_SIZE);
  });

  it("supports a screen-specific option set and fallback", () => {
    expect(parsePageSize("15", [15, 30, 60], 15)).toBe(15);
    expect(parsePageSize("20", [15, 30, 60], 15)).toBe(15);
  });

  it("keeps empty lists on page one and rounds populated lists up", () => {
    expect(getLastPage(0, 20)).toBe(1);
    expect(getLastPage(20, 20)).toBe(1);
    expect(getLastPage(21, 20)).toBe(2);
  });
});
