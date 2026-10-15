import { selectFlatPages } from "./select-flat-pages";

const PAGINATION = { hasMore: false, nextCursor: null, limit: 20 };

describe("selectFlatPages — the selected result is a flat item array while raw pages retain pagination", () => {
  it("returns the items from a single page in the same order they arrived", () => {
    const result = selectFlatPages({
      pages: [{ data: [1, 2, 3], pagination: PAGINATION }],
      pageParams: [undefined],
    });
    expect(result).toEqual([1, 2, 3]);
  });

  it("concatenates multiple pages preserving page order, so page 1 items precede page 2 items", () => {
    const result = selectFlatPages({
      pages: [
        { data: [1, 2], pagination: { ...PAGINATION, hasMore: true, nextCursor: "c2" } },
        { data: [3, 4], pagination: PAGINATION },
      ],
      pageParams: [undefined, "c2"],
    });
    expect(result).toEqual([1, 2, 3, 4]);
  });

  it("returns an empty array for an empty page, so the consumer never sees undefined", () => {
    const result = selectFlatPages({
      pages: [{ data: [], pagination: PAGINATION }],
      pageParams: [undefined],
    });
    expect(result).toEqual([]);
  });

  it("returns an empty array when there are no pages yet, so the initial pending state is safe", () => {
    const result = selectFlatPages({ pages: [], pageParams: [] });
    expect(result).toEqual([]);
  });

  it("works with object items, so the generic is not constrained to primitives", () => {
    const item = { id: 1, name: "Widget" };
    const result = selectFlatPages({
      pages: [{ data: [item], pagination: PAGINATION }],
      pageParams: [undefined],
    });
    expect(result).toEqual([item]);
  });

  it("does not attach cursor metadata to the selected result or mutate the raw pages", () => {
    const raw = {
      pages: [{ data: [{ id: 1 }], pagination: { limit: 20, hasMore: true, nextCursor: "next-2" } }],
      pageParams: [undefined],
    };
    const selected = selectFlatPages(raw);
    expect(selected).toEqual([{ id: 1 }]);
    expect(Object.hasOwn(selected, "pages")).toBe(false);
    expect(raw.pages[0]?.pagination.nextCursor).toBe("next-2");
  });
});
