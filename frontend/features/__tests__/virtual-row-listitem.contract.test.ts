import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { collectSourceFiles, FE_ROOT } from "@/test-utils/keyboard-reachability-analysis";

/**
 * react-window v2 puts `role="list"` on the scroll container itself and hands
 * each row component an `ariaAttributes` prop carrying `role="listitem"` plus
 * `aria-posinset`/`aria-setsize`. Neither role appears anywhere in this
 * repository's source, so the static ARIA census cannot see this relationship
 * at all and a rendered suite only sees the rows a fixture happened to mount.
 *
 * A row that returns early — no item yet, a "load more" sentinel, a date
 * header — and forgets the spread puts a NON-listitem child inside a
 * `role="list"`. That is `aria-required-children`, which axe rates critical,
 * and it was live on all six virtual lists in the product: notifications,
 * inbox, chat members, mail, the kanban column and the calendar panel. The
 * browser run found it on `/notifications`, `/inbox` and `/build/{id}`.
 *
 * The invariant this pins is narrow and mechanical: inside a react-window row
 * component, every element that positions itself with the injected `style`
 * prop is a row, and every row must carry the attributes that make it a
 * listitem.
 */
const ROW_PROP_MARKER = "RowComponentProps";

interface RowElement {
  file: string;
  line: number;
  tag: string;
  spreadsAriaAttributes: boolean;
}

/**
 * Locates the opening tag that owns a `style={style}` / `style={{ ...style`
 * attribute by scanning back to its `<` and forward to the `>` that closes it,
 * skipping over nested braces so a `style={{ ...style, paddingBottom: 8 }}`
 * does not end the tag early.
 */
export function findRowElements(file: string, source: string): RowElement[] {
  const out: RowElement[] = [];
  const pattern = /style=\{(?:style\b|\{\s*\.\.\.style\b|mergeRowStyle\()/g;
  let match = pattern.exec(source);
  while (match) {
    const open = source.lastIndexOf("<", match.index);
    if (open !== -1) {
      let depth = 0;
      let end = open;
      while (end < source.length) {
        const ch = source[end];
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
        else if (ch === ">" && depth === 0) break;
        end += 1;
      }
      const tag = source.slice(open, end + 1);
      out.push({
        file,
        line: source.slice(0, open).split("\n").length,
        tag: tag.slice(0, 60).replace(/\s+/g, " "),
        spreadsAriaAttributes: tag.includes("{...ariaAttributes}"),
      });
    }
    match = pattern.exec(source);
  }
  return out;
}

const rowFiles = collectSourceFiles(FE_ROOT).filter((file) =>
  readFileSync(file, "utf8").includes(ROW_PROP_MARKER),
);

const elements = rowFiles.flatMap((file) =>
  findRowElements(relative(FE_ROOT, file), readFileSync(file, "utf8")),
);

describe("virtual rows are listitems — the census has a real denominator", () => {
  it("finds every react-window row component in the corpus", () => {
    expect(rowFiles.length).toBeGreaterThanOrEqual(6);
  });

  it("finds the row elements inside them", () => {
    expect(elements.length).toBeGreaterThanOrEqual(rowFiles.length);
  });
});

describe("every row inside a role=list container is a listitem", () => {
  it("no row element drops the ariaAttributes spread", () => {
    const missing = elements.filter((el) => !el.spreadsAriaAttributes);
    expect(
      missing.map((el) => `${el.file}:${el.line} ${el.tag}`).join("\n"),
    ).toBe("");
  });
});

describe("BITE — the scan reports a dropped spread rather than passing over it", () => {
  it("flags an early-return row that positions itself but claims no role", () => {
    const planted = `
      function Row({ index, style, ariaAttributes, items }: RowComponentProps<D>) {
        const item = items[index];
        if (!item) return <div style={style} />;
        return <div style={style} {...ariaAttributes}>{item.name}</div>;
      }
    `;
    const found = findRowElements("planted.tsx", planted);
    expect(found).toHaveLength(2);
    expect(found.filter((el) => !el.spreadsAriaAttributes)).toHaveLength(1);
  });

  it("does not lose the tag to a spread style object's own braces", () => {
    const planted = `<div style={{ ...style, paddingBottom: 8 }} {...ariaAttributes} />`;
    const found = findRowElements("planted.tsx", planted);
    expect(found).toHaveLength(1);
    expect(found[0]?.spreadsAriaAttributes).toBe(true);
  });

  it("BITE — a row that spreads something else is not mistaken for a listitem", () => {
    const planted = `<div style={style} {...provided.draggableProps} />`;
    const found = findRowElements("planted.tsx", planted);
    expect(found[0]?.spreadsAriaAttributes).toBe(false);
  });
});
