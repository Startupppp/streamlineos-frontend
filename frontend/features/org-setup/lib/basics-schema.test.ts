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
  const parsed = workspaceStepSchema.safeParse({ teamSize: "1-10", industry: "Agency", ...input });
  if (parsed.success) return null;
  return parsed.error.issues.find((i) => i.path[0] === field)?.message ?? null;
}

describe("workspaceStepSchema", () => {
  it("rejects a two-digit phone with an inline message and accepts a real or blank one", () => {
    expect(issueFor("phone", { displayName: "Acme", phone: "12" })).toMatch(/valid phone number/);
    expect(issueFor("phone", { displayName: "Acme", phone: "+91 98765 43210" })).toBeNull();
    expect(issueFor("phone", { displayName: "Acme", phone: "" })).toBeNull();
  });

  it("requires the fields the completion API requires", () => {
    expect(issueFor("teamSize", { displayName: "Acme", teamSize: "", industry: "Agency" })).toBe("Select a team size.");
    expect(issueFor("industry", { displayName: "Acme", teamSize: "1-10", industry: "" })).toBe("Select an industry.");
    expect(workspaceStepSchema.safeParse({ displayName: "Acme", teamSize: "1-10", industry: "Agency" }).success).toBe(true);
  });

  it("optional fields are absent when not provided", () => {
    const parsed = workspaceStepSchema.safeParse({ displayName: "Acme", teamSize: "1-10", industry: "Agency" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.teamSize).toBe("1-10");
      expect(parsed.data.timezone).toBeUndefined();
      expect(parsed.data.region).toBeUndefined();
      expect(parsed.data.companyName).toBeUndefined();
      expect(parsed.data.industry).toBe("Agency");
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
      teamSize: "1-10",
      industry: "Agency",
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
      teamSize: "1-10",
      industry: "Agency",
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

  it("shows the server-required fields by default", () => {
    expect(WORKSPACE_VISIBLE_FIELDS).toEqual(expect.arrayContaining(["displayName", "teamSize", "industry"]));
  });

  it("displayName is in visible fields", () => {
    expect(WORKSPACE_VISIBLE_FIELDS).toContain("displayName");
  });

  it("companyName is NOT in the visible defaults (it is advanced)", () => {
    expect(WORKSPACE_VISIBLE_FIELDS).not.toContain("companyName");
  });

  it("industry is visible before launch", () => {
    expect(WORKSPACE_VISIBLE_FIELDS).toContain("industry");
  });

  it("advanced field count is at least 1", () => {
    const allFields = Object.keys(workspaceStepSchema.shape) as string[];
    const advancedCount = allFields.filter(
      (f) => !(WORKSPACE_VISIBLE_FIELDS as readonly string[]).includes(f),
    ).length;
    expect(advancedCount).toBeGreaterThanOrEqual(1);
  });
});
