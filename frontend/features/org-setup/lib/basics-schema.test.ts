import {
  workspaceStepSchema,
  DISPLAY_NAME_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  INDUSTRY_MAX_LENGTH,
  WORKSPACE_VISIBLE_FIELDS,
} from "./basics-schema";

function issueFor(
  field: string,
  input: Record<string, unknown>,
): string | null {
  const parsed = workspaceStepSchema.safeParse(input);
  if (parsed.success) return null;
  return parsed.error.issues.find((i) => i.path[0] === field)?.message ?? null;
}

describe("workspaceStepSchema", () => {
  it("accepts minimal input with displayName only", () => {
    expect(workspaceStepSchema.safeParse({ displayName: "Acme" }).success).toBe(true);
  });

  it("optional fields are absent when not provided", () => {
    const parsed = workspaceStepSchema.safeParse({ displayName: "Acme" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.teamSize).toBeUndefined();
      expect(parsed.data.timezone).toBeUndefined();
      expect(parsed.data.region).toBeUndefined();
      expect(parsed.data.companyName).toBeUndefined();
      expect(parsed.data.industry).toBeUndefined();
      expect(parsed.data.phone).toBeUndefined();
    }
  });

  it("rejects empty displayName", () => {
    expect(issueFor("displayName", { displayName: "" })).toBe("Enter a workspace name.");
  });

  it("rejects displayName over the cap", () => {
    const displayName = "a".repeat(DISPLAY_NAME_MAX_LENGTH + 1);
    expect(issueFor("displayName", { displayName })).toContain("characters or fewer");
  });

  it("accepts displayName at the cap", () => {
    const displayName = "a".repeat(DISPLAY_NAME_MAX_LENGTH);
    expect(issueFor("displayName", { displayName })).toBeNull();
  });

  it("advanced field companyName is preserved when provided", () => {
    const parsed = workspaceStepSchema.safeParse({
      displayName: "Acme",
      companyName: "Acme Corp Ltd",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.companyName).toBe("Acme Corp Ltd");
    }
  });

  it("advanced field companyName rejects over-cap value", () => {
    const companyName = "a".repeat(COMPANY_NAME_MAX_LENGTH + 1);
    expect(issueFor("companyName", { displayName: "Acme", companyName })).toContain(
      "characters or fewer",
    );
  });

  it("advanced field industry rejects over-cap value", () => {
    const industry = "b".repeat(INDUSTRY_MAX_LENGTH + 1);
    expect(issueFor("industry", { displayName: "Acme", industry })).toContain(
      "characters or fewer",
    );
  });

  it("goals preserved in advanced section", () => {
    const parsed = workspaceStepSchema.safeParse({
      displayName: "Acme",
      goals: ["build"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.goals).toEqual(["build"]);
    }
  });
});

describe("WORKSPACE_VISIBLE_FIELDS — at most 5 visible fields", () => {
  it("visible field count is at most 5", () => {
    expect(WORKSPACE_VISIBLE_FIELDS.length).toBeLessThanOrEqual(5);
  });

  it("exactly 4 default visible fields", () => {
    expect(WORKSPACE_VISIBLE_FIELDS.length).toBe(4);
  });

  it("displayName is in visible fields", () => {
    expect(WORKSPACE_VISIBLE_FIELDS).toContain("displayName");
  });

  it("companyName is NOT in the visible defaults (it is advanced)", () => {
    expect(WORKSPACE_VISIBLE_FIELDS).not.toContain("companyName");
  });

  it("industry is NOT in the visible defaults (it is advanced)", () => {
    expect(WORKSPACE_VISIBLE_FIELDS).not.toContain("industry");
  });

  it("advanced field count is at least 1", () => {
    const allFields = Object.keys(workspaceStepSchema.shape) as string[];
    const advancedCount = allFields.filter(
      (f) => !(WORKSPACE_VISIBLE_FIELDS as readonly string[]).includes(f),
    ).length;
    expect(advancedCount).toBeGreaterThanOrEqual(1);
  });
});
