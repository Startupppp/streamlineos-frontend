import {
  isListItemChecked,
  listIndentOf,
  listOrdinalLabel,
  listOrdinalOf,
  listPaddingRem,
  listStyleTypeOf,
} from "./plate-list-model";

describe("listOrdinalOf — a numbered list must count, and the count lives on the node", () => {
  it("reads the plugin's listStart, which is what makes item three render as 3", () => {
    expect(listOrdinalOf({ listStyleType: "decimal", listStart: 3 })).toBe(3);
  });

  it("treats a missing listStart as the first item, because the normalizer unsets it there", () => {
    expect(listOrdinalOf({ listStyleType: "decimal" })).toBe(1);
  });

  it("renders the ordinal with its separator", () => {
    expect(listOrdinalLabel({ listStyleType: "decimal", listStart: 12 })).toBe("12.");
    expect(listOrdinalLabel({ listStyleType: "decimal" })).toBe("1.");
  });

  it("refuses a nonsensical stored start rather than rendering NaN", () => {
    expect(listOrdinalOf({ listStart: 0 })).toBe(1);
    expect(listOrdinalOf({ listStart: -4 })).toBe(1);
    expect(listOrdinalOf({ listStart: "3" })).toBe(1);
    expect(listOrdinalOf({ listStart: Number.NaN })).toBe(1);
  });
});

describe("listStyleTypeOf — only the three kinds this editor writes are list kinds", () => {
  it.each([
    ["disc", "disc"],
    ["decimal", "decimal"],
    ["todo", "todo"],
  ])("recognises %s", (stored, expected) => {
    expect(listStyleTypeOf({ listStyleType: stored })).toBe(expected);
  });

  it("is null for a plain paragraph", () => {
    expect(listStyleTypeOf({})).toBeNull();
  });

  it("is null for a style the renderers have no marker for, rather than a broken bullet", () => {
    expect(listStyleTypeOf({ listStyleType: "lower-roman" })).toBeNull();
    expect(listStyleTypeOf({ listStyleType: 3 })).toBeNull();
  });
});

describe("listIndentOf — nesting is carried by indent and must never collapse to zero", () => {
  it("keeps the stored nesting level", () => {
    expect(listIndentOf({ indent: 3 })).toBe(3);
  });

  it("floors at one, so a top-level item still clears the marker column", () => {
    expect(listIndentOf({})).toBe(1);
    expect(listIndentOf({ indent: 0 })).toBe(1);
    expect(listIndentOf({ indent: -2 })).toBe(1);
  });

  it("indents each level by a fixed step both renderers share", () => {
    expect(listPaddingRem({ indent: 1 })).toBe("1.5rem");
    expect(listPaddingRem({ indent: 2 })).toBe("3rem");
  });
});

describe("isListItemChecked — a to-do is only done when the document says so", () => {
  it("is true only for a literal true", () => {
    expect(isListItemChecked({ checked: true })).toBe(true);
    expect(isListItemChecked({ checked: false })).toBe(false);
    expect(isListItemChecked({})).toBe(false);
    expect(isListItemChecked({ checked: "true" })).toBe(false);
  });
});
