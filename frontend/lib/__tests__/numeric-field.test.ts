import { numericFieldValue, numericFieldChange } from "@/lib/numeric-field";

describe("numericFieldValue", () => {
  it("reads a plain number", () => {
    expect(numericFieldValue("42")).toBe(42);
  });

  it("keeps a decimal rather than truncating it, so an integer schema can say so", () => {
    expect(numericFieldValue("1.5")).toBe(1.5);
  });

  it("reads a negative number", () => {
    expect(numericFieldValue("-7")).toBe(-7);
  });

  it("treats an emptied box as absent, not as zero", () => {
    expect(numericFieldValue("")).toBeUndefined();
  });

  it("treats a whitespace-only box as absent", () => {
    expect(numericFieldValue("   ")).toBeUndefined();
  });

  it("BITE PROOF — never returns NaN, which is what parseInt('') produced", () => {
    expect(Number.isNaN(parseInt("", 10))).toBe(true);
    expect(numericFieldValue("")).toBeUndefined();
    expect(numericFieldValue("abc")).toBeUndefined();
    expect(numericFieldValue("--")).toBeUndefined();
  });

  it("BITE PROOF — an emptied box is not silently zero, which is what Number('') produced", () => {
    expect(Number("")).toBe(0);
    expect(numericFieldValue("")).not.toBe(0);
  });

  it("refuses a non-finite value", () => {
    expect(numericFieldValue("Infinity")).toBeUndefined();
  });

  it("still reads a real zero", () => {
    expect(numericFieldValue("0")).toBe(0);
  });
});

describe("numericFieldChange", () => {
  it("hands the field the coerced value", () => {
    const onChange = jest.fn();
    numericFieldChange(onChange)({
      target: { value: "12" },
    } as React.ChangeEvent<HTMLInputElement>);
    expect(onChange).toHaveBeenCalledWith(12);
  });

  it("hands the field undefined when the box is cleared", () => {
    const onChange = jest.fn();
    numericFieldChange(onChange)({
      target: { value: "" },
    } as React.ChangeEvent<HTMLInputElement>);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("returns a named handler, so a stack trace says which rule ran", () => {
    expect(numericFieldChange(jest.fn()).name).toBe("handleNumericFieldChange");
  });
});
