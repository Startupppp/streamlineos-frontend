import { budgetFormSchema, BUDGET_MAX, createTicketInputSchema, updateProjectSettingsInputSchema } from "./projects";

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

  it("matches the server's 2..100 bounds after trimming", () => {
    expect(updateProjectSettingsInputSchema.safeParse({ ...base, name: " a " }).success).toBe(false);
    expect(updateProjectSettingsInputSchema.safeParse({ ...base, name: "x".repeat(101) }).success).toBe(false);
  });
});

describe("createTicketInputSchema — one required message for an empty or blank title (U-005)", () => {
  function titleMessages(title: string): string[] {
    const result = createTicketInputSchema.safeParse({ projectId: 1, title, type: "TASK" });
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  }

  it.each(["", "   "])("leads with 'Title is required' for %j", (title) => {
    expect(titleMessages(title)[0]).toBe("Title is required");
  });

  it("still asks for at least 3 characters once something is typed", () => {
    expect(titleMessages("x")[0]).toBe("Title must be at least 3 characters");
  });

  it("accepts a normal title", () => {
    expect(titleMessages("Fix login")).toEqual([]);
  });
});
