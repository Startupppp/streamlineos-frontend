import { estimateTemplateNet } from "./salary-structure-template-preview";

const blank = {
  basicSalary: "",
  hraPercent: "40",
  specialAllowance: "0",
  medicalAllowance: "0",
  travelAllowance: "0",
  otherAllowances: "0",
  pfDeductionPercent: "12",
  professionalTax: "200",
};

describe("estimateTemplateNet", () => {
  it("does not treat a zero basic and professional tax as a payable negative", () => {
    expect(estimateTemplateNet(blank).valid).toBe(false);
    expect(estimateTemplateNet(blank).net).toBe(-200);
  });

  it("accepts a basic salary that covers the default deductions", () => {
    const result = estimateTemplateNet({ ...blank, basicSalary: "20000" });
    expect(result.valid).toBe(true);
    expect(result.net).toBeGreaterThan(0);
  });
});
