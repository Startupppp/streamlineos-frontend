import {
  importJobDisplayName,
  importJobItemTitles,
} from "./import-job-label";

describe("importJobDisplayName", () => {
  it("uses the single imported page title when present", () => {
    expect(
      importJobDisplayName({
        totalItems: 1,
        sourceType: "markdown",
        errorReport: { itemTitles: ["Getting started"] },
      }),
    ).toBe("Getting started");
  });

  it("joins two titles and summarizes longer batches", () => {
    expect(
      importJobDisplayName({
        totalItems: 2,
        sourceType: "markdown",
        errorReport: { itemTitles: ["Alpha", "Beta"] },
      }),
    ).toBe("Alpha, Beta");

    expect(
      importJobDisplayName({
        totalItems: 4,
        sourceType: "markdown",
        errorReport: { itemTitles: ["A", "B", "C", "D"] },
      }),
    ).toBe("A, B +2 more");
  });

  it("falls back to a page count when titles were not stored", () => {
    expect(
      importJobDisplayName({
        totalItems: 3,
        sourceType: "markdown",
        errorReport: null,
      }),
    ).toBe("3 pages");
  });
});

describe("importJobItemTitles", () => {
  it("ignores non-string title entries", () => {
    expect(
      importJobItemTitles({ itemTitles: ["Ok", 12, "", "  ", "Kept"] }),
    ).toEqual(["Ok", "Kept"]);
  });
});
