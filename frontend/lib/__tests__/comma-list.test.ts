import { commaListChange, parseCommaList } from "@/lib/comma-list";

function changeEvent(value: string): Parameters<ReturnType<typeof commaListChange>>[0] {
  return { target: { value } } as Parameters<ReturnType<typeof commaListChange>>[0];
}

describe("parseCommaList", () => {
  it("splits on commas and trims each entry", () => {
    expect(parseCommaList("CEO, SALES ,  OPS")).toEqual(["CEO", "SALES", "OPS"]);
  });

  it("drops the empty entry a trailing comma leaves behind", () => {
    expect(parseCommaList("CEO, SALES,")).toEqual(["CEO", "SALES"]);
  });

  it("drops an entry that is only whitespace", () => {
    expect(parseCommaList("CEO, , SALES")).toEqual(["CEO", "SALES"]);
  });

  it("an empty box is an empty list, not a list holding one empty string", () => {
    expect(parseCommaList("")).toEqual([]);
  });

  it("BITE PROOF — a bare split keeps the blank a trailing comma produces", () => {
    expect("CEO, SALES,".split(",")).toHaveLength(3);
    expect(parseCommaList("CEO, SALES,")).toHaveLength(2);
  });

  it("BITE PROOF — a split without trim keeps the spaces the user typed", () => {
    expect("CEO, SALES".split(",")).toContain(" SALES");
    expect(parseCommaList("CEO, SALES")).not.toContain(" SALES");
  });
});

describe("commaListChange", () => {
  it("hands the parsed list to the caller", () => {
    const onChange = jest.fn();
    commaListChange(onChange)(changeEvent("a, b,"));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });
});
