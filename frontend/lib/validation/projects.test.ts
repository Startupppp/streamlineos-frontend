import { budgetFormSchema, BUDGET_MAX, updateProjectSettingsInputSchema } from "./projects";

describe("budgetFormSchema — input validation (B-046, B-050, B-051)", () => {
  function parse(input: string) {
    return budgetFormSchema.safeParse({ budget: input });
  }

  it("accepts a valid positive integer string", () => {
    const result = parse("500000");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.budget).toBe(500000);
  });

  it("accepts zero", () => {
    const result = parse("0");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.budget).toBe(0);
  });

  it("accepts a value with two decimal places", () => {
    const result = parse("99.99");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.budget).toBe(99.99);
  });

  it("rejects a negative value (B-050)", () => {
    expect(parse("-1").success).toBe(false);
  });

  it("rejects a value exceeding BUDGET_MAX (B-046)", () => {
    expect(parse(String(BUDGET_MAX + 1)).success).toBe(false);
  });

  it("accepts BUDGET_MAX exactly", () => {
    const result = parse(String(BUDGET_MAX));
    expect(result.success).toBe(true);
  });

  it("rejects more than two decimal places (B-051)", () => {
    expect(parse("1.123").success).toBe(false);
  });

  it("rejects a non-numeric string", () => {
    expect(parse("abc").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(parse("").success).toBe(false);
  });

  it("transforms the string to a number in the output", () => {
    const result = parse("12345");
    expect(result.success).toBe(true);
    if (result.success) expect(typeof result.data.budget).toBe("number");
  });
});

describe("updateProjectSettingsInputSchema — name trim (B-007)", () => {
  const base = {
    projectId: 1,
    name: "Project",
    status: "ACTIVE" as const,
  };

  it("rejects a whitespace-only name", () => {
    expect(
      updateProjectSettingsInputSchema.safeParse({ ...base, name: "   " }).success,
    ).toBe(false);
  });

  it("trims leading and trailing spaces before validating", () => {
    const result = updateProjectSettingsInputSchema.safeParse({ ...base, name: "  My Project  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("My Project");
  });
});
