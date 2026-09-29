import { estimateTemplateNet } from "./salary-structure-template-preview";

const VALID = {
  basicSalary: "50000",
  hraPercent: "40",
  specialAllowance: "0",
  medicalAllowance: "0",
  travelAllowance: "0",
  otherAllowances: "0",
  pfDeductionPercent: "12",
  professionalTax: "200",
};

describe("BUG-008 the CTC preview refuses negative salary components", () => {
  it("calls a well-formed template payable, so the refusals below are not passing on a preview that is never valid", () => {
    expect(estimateTemplateNet(VALID)).toMatchObject({
      valid: true,
      hasNegativeComponent: false,
    });
  });

  it.each([
    ["basicSalary", "-1"],
    ["hraPercent", "-1"],
    ["specialAllowance", "-1"],
    ["medicalAllowance", "-1"],
    ["travelAllowance", "-1"],
    ["otherAllowances", "-1"],
    ["pfDeductionPercent", "-1"],
    ["professionalTax", "-1"],
  ])("refuses the preview when %s is %s, however healthy the resulting net looks", (field, value) => {
    const result = estimateTemplateNet({ ...VALID, [field]: value });

    expect(result.hasNegativeComponent).toBe(true);
    expect(result.valid).toBe(false);
  });

  it("refuses a negative allowance that a large basic salary would otherwise absorb into a positive net", () => {
    const result = estimateTemplateNet({
      ...VALID,
      basicSalary: "500000",
      specialAllowance: "-1",
    });

    expect(result.net).toBeGreaterThan(0);
    expect(result.valid).toBe(false);
  });

  it("accepts zero in every optional component, because zero is not negative", () => {
    expect(
      estimateTemplateNet({
        ...VALID,
        specialAllowance: "0",
        pfDeductionPercent: "0",
        professionalTax: "0",
      }),
    ).toMatchObject({ valid: true, hasNegativeComponent: false });
  });

  it("still refuses a blank basic salary, the case that was already guarded", () => {
    expect(estimateTemplateNet({ ...VALID, basicSalary: "" })).toMatchObject({
      valid: false,
      hasNegativeComponent: false,
    });
  });

  it("still refuses deductions that exceed gross without any component being negative", () => {
    expect(
      estimateTemplateNet({ ...VALID, basicSalary: "100", professionalTax: "5000" }),
    ).toMatchObject({ valid: false, hasNegativeComponent: false });
  });
});
