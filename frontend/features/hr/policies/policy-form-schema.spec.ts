import { policyFormSchema } from "./policy-form-types";

const baseLeave = {
  policyType: "leave" as const,
  name: "Test Leave",
  effectiveFrom: "2026-01-01",
  priority: 0,
  rules: {} as Record<string, unknown>,
  scopes: [{ scopeType: "organization" as const, scopeValue: "" }],
};

function issuePathsFor(rules: Record<string, unknown>): string[] {
  const result = policyFormSchema.safeParse({ ...baseLeave, rules });
  if (result.success) return [];
  return result.error.issues.map((i) => i.path.join("."));
}

describe("policyFormSchema leave — maxBalance", () => {
  it("adds a rules.maxBalance issue when value is negative because the balance ceiling cannot be below zero", () => {
    const paths = issuePathsFor({ maxBalance: -1 });
    expect(paths).toContain("rules.maxBalance");
  });

  it("adds a rules.maxBalance issue when value exceeds 365 because a single year is the domain ceiling", () => {
    const paths = issuePathsFor({ maxBalance: 366 });
    expect(paths).toContain("rules.maxBalance");
  });

  it("adds a rules.maxBalance issue when value has 3 decimal places because at most 2 are accepted", () => {
    const paths = issuePathsFor({ maxBalance: 1.125 });
    expect(paths).toContain("rules.maxBalance");
  });

  it("adds no maxBalance issue when value is a valid number within bounds", () => {
    const paths = issuePathsFor({ maxBalance: 30 });
    expect(paths.filter((p) => p === "rules.maxBalance")).toHaveLength(0);
  });
});

describe("policyFormSchema leave — carryForwardLimit", () => {
  it("adds a rules.carryForwardLimit issue when value is negative because accrued days cannot be negative", () => {
    const paths = issuePathsFor({ carryForwardLimit: -1 });
    expect(paths).toContain("rules.carryForwardLimit");
  });

  it("adds a rules.carryForwardLimit issue when value exceeds 365 because a single year is the domain ceiling", () => {
    const paths = issuePathsFor({ carryForwardLimit: 366 });
    expect(paths).toContain("rules.carryForwardLimit");
  });

  it("adds a rules.carryForwardLimit issue when value has 3 decimal places because at most 2 are accepted", () => {
    const paths = issuePathsFor({ carryForwardLimit: 2.125 });
    expect(paths).toContain("rules.carryForwardLimit");
  });

  it("adds no carryForwardLimit issue when value is a valid number within bounds", () => {
    const paths = issuePathsFor({ carryForwardLimit: 10 });
    expect(paths.filter((p) => p === "rules.carryForwardLimit")).toHaveLength(0);
  });
});

describe("policyFormSchema leave — carryForwardLimit cross-field rule", () => {
  it("adds a rules.carryForwardLimit issue when it exceeds maxBalance because carrying forward more than the ceiling is not a usable configuration", () => {
    const paths = issuePathsFor({ maxBalance: 20, carryForwardLimit: 25 });
    expect(paths).toContain("rules.carryForwardLimit");
  });

  it("adds no cross-field issue when carryForwardLimit equals maxBalance because the carry forward may use the full ceiling", () => {
    const paths = issuePathsFor({ maxBalance: 20, carryForwardLimit: 20 });
    expect(paths.filter((p) => p === "rules.carryForwardLimit")).toHaveLength(0);
  });
});
