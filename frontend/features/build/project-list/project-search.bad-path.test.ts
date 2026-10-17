import { normalizeListSearch, LIST_SEARCH_MAX } from "@/lib/build/normalize-list-search";

describe("projects search — bad paths", () => {
  it("collapses empty and whitespace search to an empty query", () => {
    expect(normalizeListSearch("")).toBe("");
    expect(normalizeListSearch("   ")).toBe("");
  });

  it("truncates an oversized search string", () => {
    expect(normalizeListSearch("q".repeat(LIST_SEARCH_MAX + 50)).length).toBe(
      LIST_SEARCH_MAX,
    );
  });

  it("keeps a normal query on the happy path", () => {
    expect(normalizeListSearch("  alpha  ")).toBe("alpha");
  });
});
