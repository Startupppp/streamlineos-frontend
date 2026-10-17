import { computeVersionDiff } from "./version-diff";

function tipTapDoc(blocks: Array<{ type: string; text: string }>) {
  return {
    type: "doc",
    content: blocks.map((b) => ({
      type: b.type,
      content: [{ type: "text", text: b.text }],
    })),
  };
}

describe("computeVersionDiff — title comparison", () => {
  it("detects a title change", () => {
    const result = computeVersionDiff("Old Title", null, "New Title", null);
    expect(result.titleChanged).toBe(true);
    expect(result.oldTitle).toBe("Old Title");
    expect(result.newTitle).toBe("New Title");
  });

  it("reports no title change when titles are equal", () => {
    const result = computeVersionDiff("Same", null, "Same", null);
    expect(result.titleChanged).toBe(false);
  });
});

describe("computeVersionDiff — semantic block diff: unchanged", () => {
  it("marks identical blocks as unchanged", () => {
    const content = tipTapDoc([
      { type: "paragraph", text: "Hello world" },
      { type: "paragraph", text: "Second paragraph" },
    ]);
    const result = computeVersionDiff("T", content, "T", content);
    const kinds = result.blocks.map((b) => b.kind);
    expect(kinds.every((k) => k === "unchanged")).toBe(true);
    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(0);
    expect(result.changedCount).toBe(0);
  });
});

describe("computeVersionDiff — semantic block diff: added blocks", () => {
  it("marks a block present in current but absent in version as added", () => {
    const versionContent = tipTapDoc([{ type: "paragraph", text: "Original" }]);
    const currentContent = tipTapDoc([
      { type: "paragraph", text: "Original" },
      { type: "paragraph", text: "New paragraph" },
    ]);
    const result = computeVersionDiff("T", versionContent, "T", currentContent);
    const added = result.blocks.filter((b) => b.kind === "added");
    expect(added).toHaveLength(1);
    expect(added[0]?.text).toBe("New paragraph");
    expect(result.addedCount).toBe(1);
  });
});

describe("computeVersionDiff — semantic block diff: removed blocks", () => {
  it("marks a block present in version but absent in current as removed", () => {
    const versionContent = tipTapDoc([
      { type: "paragraph", text: "Original" },
      { type: "paragraph", text: "Removed paragraph" },
    ]);
    const currentContent = tipTapDoc([{ type: "paragraph", text: "Original" }]);
    const result = computeVersionDiff("T", versionContent, "T", currentContent);
    const removed = result.blocks.filter((b) => b.kind === "removed");
    expect(removed).toHaveLength(1);
    expect(removed[0]?.text).toBe("Removed paragraph");
    expect(result.removedCount).toBe(1);
  });
});

describe("computeVersionDiff — semantic block diff: changed blocks", () => {
  it("merges a removed+added pair with high text similarity into a changed block", () => {
    const versionContent = tipTapDoc([
      { type: "paragraph", text: "Hello world today is great" },
    ]);
    const currentContent = tipTapDoc([
      { type: "paragraph", text: "Hello world today is wonderful" },
    ]);
    const result = computeVersionDiff("T", versionContent, "T", currentContent);
    const changed = result.blocks.filter((b) => b.kind === "changed");
    expect(changed.length).toBeGreaterThanOrEqual(1);
    expect(changed[0]?.altText).toBeDefined();
    expect(result.changedCount).toBeGreaterThanOrEqual(1);
  });
});

describe("computeVersionDiff — not a word count", () => {
  it("result does not have wordCountDelta property (old API gone)", () => {
    const result = computeVersionDiff("T", null, "T", null);
    expect(result).not.toHaveProperty("wordCountDelta");
  });
});

describe("computeVersionDiff — block types preserved", () => {
  it("preserves the block type in the diff result", () => {
    const versionContent = tipTapDoc([]);
    const currentContent = tipTapDoc([
      { type: "heading", text: "A heading" },
    ]);
    const result = computeVersionDiff("T", versionContent, "T", currentContent);
    const added = result.blocks.filter((b) => b.kind === "added");
    expect(added[0]?.type).toBe("heading");
  });
});

describe("computeVersionDiff — null content", () => {
  it("handles null version content gracefully", () => {
    const current = tipTapDoc([{ type: "paragraph", text: "content" }]);
    const result = computeVersionDiff("T", null, "T", current);
    expect(result.addedCount).toBeGreaterThanOrEqual(1);
    expect(result.removedCount).toBe(0);
  });

  it("handles null current content gracefully", () => {
    const version = tipTapDoc([{ type: "paragraph", text: "old content" }]);
    const result = computeVersionDiff("T", version, "T", null);
    expect(result.removedCount).toBeGreaterThanOrEqual(1);
    expect(result.addedCount).toBe(0);
  });
});

describe("computeVersionDiff — Slate array format", () => {
  it("handles Slate array content", () => {
    const slateContent = [
      { type: "paragraph", children: [{ text: "Slate block" }] },
    ];
    const result = computeVersionDiff(
      "T",
      slateContent as Record<string, unknown>[],
      "T",
      slateContent as Record<string, unknown>[],
    );
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.blocks.every((b) => b.kind === "unchanged")).toBe(true);
  });
});
