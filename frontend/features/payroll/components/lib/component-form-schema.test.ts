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
