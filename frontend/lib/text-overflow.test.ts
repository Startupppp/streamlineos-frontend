import {
  FLEX_TITLE_SLOT,
  TEXT_FLEX_CHILD,
  TEXT_ONE_LINE,
  TEXT_THREE_LINES,
  TEXT_TWO_LINES,
} from "./text-overflow";

describe("text-overflow helpers", () => {
  it("locks single-line truncate to a block box that can shrink", () => {
    const tokens = TEXT_ONE_LINE.split(/\s+/);
    expect(tokens).toEqual(
      expect.arrayContaining(["block", "min-w-0", "max-w-full", "truncate"]),
    );
    expect(tokens).not.toContain("w-full");
  });

  it("keeps multi-line clamps free of display:block so line-clamp wins", () => {
    expect(TEXT_TWO_LINES).toContain("line-clamp-2");
    expect(TEXT_THREE_LINES).toContain("line-clamp-3");
    expect(TEXT_TWO_LINES.split(/\s+/)).not.toContain("block");
    expect(TEXT_THREE_LINES.split(/\s+/)).not.toContain("block");
  });

  it("gives flex title slots an overflow-hidden shrink chain", () => {
    expect(TEXT_FLEX_CHILD.split(/\s+/)).toEqual(
      expect.arrayContaining(["min-w-0", "max-w-full", "overflow-hidden"]),
    );
    expect(FLEX_TITLE_SLOT.split(/\s+/)).toEqual(
      expect.arrayContaining([
        "min-w-0",
        "max-w-full",
        "flex-1",
        "overflow-hidden",
      ]),
    );
  });
});
