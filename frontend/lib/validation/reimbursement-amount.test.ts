import { reimbursementAmountStringSchema } from "./reimbursement-amount";
import { reimbursementSchema as hrSchema } from "@/features/hr/reimbursements/reimbursement-schema";
import { reimbursementSchema as essSchema } from "@/features/payroll/ess/components/ess-reimbursements-schema";

function hrAmountIssues(amount: string): string[] {
  const result = hrSchema.safeParse({ category: "Travel", customCategory: "", amount, description: "" });
  return result.success ? [] : result.error.issues.filter((i) => i.path[0] === "amount").map((i) => i.message);
}

function essAmountIssues(amount: string): string[] {
  const result = essSchema.safeParse({
    category: "Travel",
    amount,
    description: "Test",
    payrollMonth: "2026-09",
  });
  return result.success ? [] : result.error.issues.filter((i) => i.path[0] === "amount").map((i) => i.message);
}

describe("reimbursementAmountStringSchema — shared frontend amount rule (PAY-004)", () => {
  it("accepts 1234.57, two-decimal-place values above ₹1 and whole rupees", () => {
    expect(reimbursementAmountStringSchema.safeParse("1234.57").success).toBe(true);
    expect(reimbursementAmountStringSchema.safeParse("99.99").success).toBe(true);
    expect(reimbursementAmountStringSchema.safeParse("1.07").success).toBe(true);
    expect(reimbursementAmountStringSchema.safeParse("1").success).toBe(true);
    expect(reimbursementAmountStringSchema.safeParse("999999").success).toBe(true);
  });

  it("rejects 1234.5678 and 10.005 which have more than two decimal places", () => {
    expect(reimbursementAmountStringSchema.safeParse("1234.5678").success).toBe(false);
    expect(reimbursementAmountStringSchema.safeParse("10.005").success).toBe(false);
  });

  it("rejects amounts below ₹1", () => {
    expect(reimbursementAmountStringSchema.safeParse("0").success).toBe(false);
    expect(reimbursementAmountStringSchema.safeParse("0.50").success).toBe(false);
    expect(reimbursementAmountStringSchema.safeParse("-1").success).toBe(false);
  });

  it("rejects amounts above ₹9,99,999", () => {
    expect(reimbursementAmountStringSchema.safeParse("1000000").success).toBe(false);
  });

  it("rejects a non-numeric string", () => {
    expect(reimbursementAmountStringSchema.safeParse("abc").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(reimbursementAmountStringSchema.safeParse("").success).toBe(false);
  });
});

describe("HR reimbursement form — amount field (PAY-004)", () => {
  it("rejects 1234.5678 which previously had no two-decimal-place guard on the HR form", () => {
    expect(hrAmountIssues("1234.5678")).toContain("Amount must have at most 2 decimal places");
  });

  it("accepts 1234.57 and other valid two-decimal claims", () => {
    expect(hrAmountIssues("1234.57")).toHaveLength(0);
    expect(hrAmountIssues("99.99")).toHaveLength(0);
    expect(hrAmountIssues("1")).toHaveLength(0);
  });
});

describe("ESS reimbursement form — amount field (PAY-004)", () => {
  it("rejects 1234.5678 on the ESS form, which previously accepted it and let Postgres silently round the claim to an amount the employee did not type", () => {
    expect(essAmountIssues("1234.5678")).toContain("Amount must have at most 2 decimal places");
  });

  it("rejects 0.50 which is below the ₹1 floor now shared with the HR route", () => {
    expect(essAmountIssues("0.50")).not.toHaveLength(0);
  });

  it("accepts 1234.57 and other valid two-decimal claims above ₹1", () => {
    expect(essAmountIssues("1234.57")).toHaveLength(0);
    expect(essAmountIssues("99.99")).toHaveLength(0);
  });

  it("applies the identical amount rule on the HR form and the ESS form, because both submit to routes that write the same decimal(15,2) column", () => {
    expect(hrAmountIssues("1234.5678")).not.toHaveLength(0);
    expect(essAmountIssues("1234.5678")).not.toHaveLength(0);
    expect(hrAmountIssues("1234.57")).toHaveLength(0);
    expect(essAmountIssues("1234.57")).toHaveLength(0);
  });
});
