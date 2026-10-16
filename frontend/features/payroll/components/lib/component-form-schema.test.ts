import { componentFormSchema, fromComponentCalc, toCalcPayload } from "./component-form-schema";

describe("percent of another component", () => {
  it("saves a percent of a component code as a formula the payroll engine reads", () => {
    expect(toCalcPayload({ calcMethod: "PERCENT_OF", percentBase: "BASIC_PAY", percent: "50", formula: "" })).toEqual({
      calcMethod: "FORMULA",
      formula: "BASIC_PAY * 50 / 100",
    });
  });

  it("keeps Basic and Gross on their native calc methods", () => {
    expect(toCalcPayload({ calcMethod: "PERCENT_OF", percentBase: "basic", percent: "40" })).toEqual({
      calcMethod: "PERCENT_OF_BASIC",
      percent: "40",
    });
    expect(toCalcPayload({ calcMethod: "PERCENT_OF", percentBase: "gross", percent: "12.5" })).toEqual({
      calcMethod: "PERCENT_OF_GROSS",
      percent: "12.5",
    });
  });

  it("reads a saved component back into the percent-of editor", () => {
    expect(fromComponentCalc({ calcMethod: "FORMULA", percent: null, formula: "HRA * 12.5 / 100" })).toMatchObject({
      calcMethod: "PERCENT_OF",
      percentBase: "HRA",
      percent: "12.5",
    });
    expect(fromComponentCalc({ calcMethod: "PERCENT_OF_BASIC", percent: "40.0000", formula: null })).toMatchObject({
      calcMethod: "PERCENT_OF",
      percentBase: "basic",
      percent: "40",
    });
  });

  it("leaves a hand-written formula as a formula", () => {
    expect(fromComponentCalc({ calcMethod: "FORMULA", percent: null, formula: "min(basic * 0.12, 1800)" })).toEqual({
      calcMethod: "FORMULA",
      percentBase: "",
      percent: "",
      formula: "min(basic * 0.12, 1800)",
    });
  });

  it("refuses a percent-of with no base or no percentage", () => {
    const base = {
      name: "HRA", code: "HRA", type: "EARNING", calcMethod: "PERCENT_OF",
      taxable: false, showOnPayslip: true, includeInCtc: true,
    };
    expect(componentFormSchema.safeParse({ ...base, percent: "50", percentBase: "BASIC" }).success).toBe(true);
    const missing = componentFormSchema.safeParse({ ...base, percent: "", percentBase: "" });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues.map((i) => i.path[0])).toEqual(["percentBase", "percent"]);
  });
});

describe("PAY-B-003 PAY-B-027 componentFormSchema percent-of rejects > 100", () => {
  const base = {
    name: "HRA", code: "HRA", type: "EARNING", calcMethod: "PERCENT_OF",
    taxable: false, showOnPayslip: true, includeInCtc: true,
  };

  it("accepts a valid percent value of 100", () => {
    expect(
      componentFormSchema.safeParse({ ...base, percent: "100", percentBase: "basic" }).success,
    ).toBe(true);
  });

  it("PAY-B-003 rejects 150% that QA was able to save", () => {
    const result = componentFormSchema.safeParse({ ...base, percent: "150", percentBase: "basic" });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("percent");
  });

  it("PAY-B-028 rejects 0% that produces a ₹0 active line", () => {
    const result = componentFormSchema.safeParse({ ...base, percent: "0", percentBase: "basic" });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("percent");
  });
});

describe("PAY-B-004 / PAY-B-029 / PAY-B-030 component form rules", () => {
  const fixed = {
    name: "Basic", code: "BASIC", type: "EARNING", calcMethod: "FIXED",
    taxable: true, showOnPayslip: true, includeInCtc: true,
  };

  it("rejects a negative or malformed amount inline and accepts a plain one", () => {
    const negative = componentFormSchema.safeParse({ ...fixed, amount: "-500" });
    expect(negative.success).toBe(false);
    expect(negative.error?.issues[0]?.message).toBe("Enter an amount like 5000 or 5000.50");
    expect(componentFormSchema.safeParse({ ...fixed, amount: "5000.50" }).success).toBe(true);
  });

  it("rejects a code with spaces or symbols and markup in the name", () => {
    expect(componentFormSchema.safeParse({ ...fixed, amount: "1", code: "MY CODE" }).success).toBe(false);
    expect(componentFormSchema.safeParse({ ...fixed, amount: "1", name: "<b>Basic</b>" }).success).toBe(false);
    expect(componentFormSchema.safeParse({ ...fixed, amount: "1", code: "my_code_2" }).success).toBe(true);
  });

  it("does not send a stale percent for a fixed component", () => {
    expect(toCalcPayload({ calcMethod: "FIXED", percent: "150", percentBase: "", formula: "" })).toEqual({
      calcMethod: "FIXED",
    });
  });
});
