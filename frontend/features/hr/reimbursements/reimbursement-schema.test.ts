import { reimbursementSchema } from "./reimbursement-schema";

function amountIssue(amount: string): string | undefined {
  const result = reimbursementSchema.safeParse({ category: "Travel", customCategory: "", amount, description: "" });
  if (result.success) return undefined;
  const messages = result.error.issues.filter((issue) => issue.path[0] === "amount").map((issue) => issue.message);
  expect(messages).toHaveLength(1);
  return messages[0];
}

describe("a reimbursement amount is a positive rupee figure", () => {
  it("names the floor on a negative or zero amount", () => {
    expect(amountIssue("-1")).toBe("Amount must be at least ₹1");
    expect(amountIssue("0")).toBe("Amount must be at least ₹1");
  });

  it("refuses an empty, non-numeric or oversized amount", () => {
    expect(amountIssue("")).toBe("Amount is required");
    expect(amountIssue("abc")).toBe("Amount must be a number");
    expect(amountIssue("1000000")).toBe("Amount must be at most ₹9,99,999");
  });

  it("accepts a decimal amount within range", () => {
    expect(amountIssue("1250.50")).toBeUndefined();
  });

  it("requires a described category only when Other is chosen", () => {
    const other = reimbursementSchema.safeParse({ category: "Other", customCategory: "  ", amount: "10", description: "" });
    expect(other.success).toBe(false);
    const travel = reimbursementSchema.safeParse({ category: "Travel", customCategory: "", amount: "10", description: "" });
    expect(travel.success).toBe(true);
  });
});
