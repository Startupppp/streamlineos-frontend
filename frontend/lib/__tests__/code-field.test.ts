import {
  codeFieldChange,
  codeFieldValue,
  digitsFieldChange,
  digitsFieldValue,
} from "@/lib/code-field";

function changeEvent(value: string): Parameters<ReturnType<typeof codeFieldChange>>[0] {
  return { target: { value } } as Parameters<ReturnType<typeof codeFieldChange>>[0];
}

describe("codeFieldValue — one rule for a bank or tax code", () => {
  it("upper-cases what was typed", () => {
    expect(codeFieldValue("sbin0001234")).toBe("SBIN0001234");
  });

  it("drops the punctuation a pasted code arrives with", () => {
    expect(codeFieldValue("SBIN-0001234")).toBe("SBIN0001234");
  });

  it("drops the surrounding whitespace a statement copies in", () => {
    expect(codeFieldValue("  sbin 0001234 ")).toBe("SBIN0001234");
  });

  it("truncates past the cap rather than refusing the value", () => {
    expect(codeFieldValue("SBIN0001234EXTRA", 11)).toBe("SBIN0001234");
  });

  it("leaves an empty box empty", () => {
    expect(codeFieldValue("", 11)).toBe("");
  });

  it("keeps every character when no cap is given", () => {
    expect(codeFieldValue("ae070331234567890123456")).toBe("AE070331234567890123456");
  });
});

describe("BITE PROOFS — the spellings this replaces, on the case that separates them", () => {
  const pasted = "SBIN0001234 ";

  it("the reject-the-edit test refuses a pasted code outright, which is the defect", () => {
    const upper = pasted.toUpperCase();
    const accepted = /^[A-Z0-9]*$/.test(upper) && upper.length <= 11;
    expect(accepted).toBe(false);
    expect(codeFieldValue(pasted, 11)).toBe("SBIN0001234");
  });

  it("upper-casing alone keeps the trailing space and hands over an invalid code", () => {
    const ifsc = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    expect(ifsc.test(pasted.toUpperCase())).toBe(false);
    expect(ifsc.test(codeFieldValue(pasted, 11))).toBe(true);
  });
});

describe("codeFieldChange — the react-hook-form binding", () => {
  it("hands the normalised value to the field", () => {
    const onChange = jest.fn();
    codeFieldChange(onChange, 10)(changeEvent("abcde-1234-f"));
    expect(onChange).toHaveBeenCalledWith("ABCDE1234F");
  });

  it("still calls the field for a value that the old test would have dropped", () => {
    const onChange = jest.fn();
    codeFieldChange(onChange, 11)(changeEvent("SBIN0001234 "));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("digitsFieldValue — a bounded numeric identifier", () => {
  it("keeps only digits", () => {
    expect(digitsFieldValue("100-123-456789")).toBe("100123456789");
  });

  it("truncates past the cap instead of refusing the edit", () => {
    expect(digitsFieldValue("1001234567890000", 12)).toBe("100123456789");
  });

  it("BITE PROOF — the length test it replaces drops a long paste entirely", () => {
    const raw = "1001234567890000";
    expect(raw.replace(/\D/g, "").length <= 12).toBe(false);
    expect(digitsFieldValue(raw, 12)).toHaveLength(12);
  });

  it("binds to a field", () => {
    const onChange = jest.fn();
    digitsFieldChange(onChange, 12)(changeEvent("100 123 456 789"));
    expect(onChange).toHaveBeenCalledWith("100123456789");
  });
});
