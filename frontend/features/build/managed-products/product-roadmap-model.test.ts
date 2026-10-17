import {
  joinReadableMeta,
  positiveFilterId,
  roadmapTargetDate,
  roadmapVoteLabel,
} from "./product-roadmap-model";

describe("positiveFilterId", () => {
  it("keeps a positive integer id", () => {
    expect(positiveFilterId("35")).toBe(35);
  });

  it("drops blank, zero, negative, and non-numeric ids", () => {
    expect(positiveFilterId("")).toBeUndefined();
    expect(positiveFilterId("0")).toBeUndefined();
    expect(positiveFilterId("-1")).toBeUndefined();
    expect(positiveFilterId("not-a-team")).toBeUndefined();
    expect(positiveFilterId("12abc")).toBeUndefined();
  });
});

describe("roadmap presentation helpers", () => {
  it("prefers target end, then start, and drops blank dates", () => {
    expect(roadmapTargetDate({ targetEnd: "2026-10-16", targetStart: "2026-10-01" })).toBe("2026-10-16");
    expect(roadmapTargetDate({ targetEnd: null, targetStart: "2026-10-01" })).toBe("2026-10-01");
    expect(roadmapTargetDate({ targetEnd: "", targetStart: "" })).toBeNull();
  });

  it("labels vote counts without exposing ids", () => {
    expect(roadmapVoteLabel(0)).toBe("0 votes");
    expect(roadmapVoteLabel(1)).toBe("1 vote");
    expect(roadmapVoteLabel(12)).toBe("12 votes");
  });

  it("joins readable meta and skips blanks", () => {
    expect(joinReadableMeta(["Planned", "Growth", "Q4"])).toBe("Planned · Growth · Q4");
    expect(joinReadableMeta(["Planned", "  ", null, undefined])).toBe("Planned");
  });
});
