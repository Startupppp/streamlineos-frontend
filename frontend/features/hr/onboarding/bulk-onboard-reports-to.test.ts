import { BULK_ONBOARD_COLUMNS, CONFLICT_KEY, LEGACY_PRIMARY_KEY, normalizeHeader, type ParsedRow } from "./bulk-onboard-columns";
import { validateAndMap } from "./bulk-onboard-template";

const DEPARTMENTS = new Set(["engineering"]);

function row(overrides: Partial<ParsedRow>): ParsedRow {
  return {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    designation: "Software Engineer",
    department: "Engineering",
    ...overrides,
  };
}

describe("bulk onboarding reporting columns (HRM-15 §7.3)", () => {
  it("writes primaryManagerEmail, optional, plus three secondary slots and effectiveFrom — never the legacy header", () => {
    const keys = BULK_ONBOARD_COLUMNS.map((column) => column.key);
    expect(keys).toEqual(expect.arrayContaining([
      "primaryManagerEmail", "secondaryManagerEmail1", "secondaryManagerEmail2", "secondaryManagerEmail3", "effectiveFrom", "topLevelRoleReason",
    ]));
    expect(keys).not.toContain("reportingManagerEmail");
    expect(BULK_ONBOARD_COLUMNS.find((column) => column.key === "primaryManagerEmail")?.required).toBe(false);
  });

  it("reads the legacy headers people already have as the primary manager", () => {
    for (const header of ["reportingManagerEmail", "reportsTo", "managerEmail", "Reports To", "Manager Email", "reporting manager", "manager"]) {
      expect(normalizeHeader(header)).toBe("primaryManagerEmail");
    }
    expect(normalizeHeader("Secondary manager email 2")).toBe("secondaryManagerEmail2");
    expect(normalizeHeader("Top-level role reason")).toBe("topLevelRoleReason");
    expect(normalizeHeader("Effective from")).toBe("effectiveFrom");
  });

  it("accepts a blank manager: the fallback policy decides it on the server", () => {
    const result = validateAndMap(row({}), DEPARTMENTS);
    expect(result.errors).toEqual([]);
    expect(result.payload).not.toHaveProperty("primaryManagerEmail");
    expect(result.payload).not.toHaveProperty("topLevelRole");
  });

  it("maps every manager column, canonicalised, and sends no legacy alias for a canonical header", () => {
    const result = validateAndMap(
      row({
        primaryManagerEmail: "Boss@Example.com",
        secondaryManagerEmail1: "func@example.com",
        secondaryManagerEmail2: "proj@example.com",
        effectiveFrom: "2026-10-01",
      }),
      DEPARTMENTS,
    );
    expect(result.errors).toEqual([]);
    expect(result.payload).toMatchObject({
      primaryManagerEmail: "boss@example.com",
      secondaryManagerEmail1: "func@example.com",
      secondaryManagerEmail2: "proj@example.com",
      effectiveFrom: "2026-10-01",
    });
    expect(result.payload).not.toHaveProperty("reportingManagerEmail");
  });

  it("maps a top-level reason, and refuses it beside any manager column", () => {
    expect(validateAndMap(row({ topLevelRoleReason: "Founder" }), DEPARTMENTS).payload).toMatchObject({
      topLevelRole: true,
      topLevelRoleReason: "Founder",
    });
    expect(validateAndMap(row({ topLevelRoleReason: "CEO", secondaryManagerEmail1: "x@example.com" }), DEPARTMENTS).errors).toContain(
      "a top-level role cannot also name a primary or secondary manager",
    );
  });

  it("refuses a self link and duplicated managers", () => {
    expect(validateAndMap(row({ primaryManagerEmail: "jane.doe@example.com" }), DEPARTMENTS).errors).toContain(
      "an employee cannot be their own manager",
    );
    expect(
      validateAndMap(row({ primaryManagerEmail: "a@example.com", secondaryManagerEmail1: "A@example.com" }), DEPARTMENTS).errors,
    ).toContain("a secondary manager duplicates the primary manager");
    expect(
      validateAndMap(row({ secondaryManagerEmail1: "b@example.com", secondaryManagerEmail3: "b@example.com" }), DEPARTMENTS).errors,
    ).toContain("the same secondary manager is listed twice");
  });

  it("holds a row to the organisation's cap by how many secondaries it names, not which columns", () => {
    // The server counts the non-blank secondaries; column 2 alone is one manager.
    expect(validateAndMap(row({ secondaryManagerEmail2: "b@example.com" }), DEPARTMENTS, 1).errors).toEqual([]);
    expect(validateAndMap(row({ secondaryManagerEmail3: "c@example.com" }), DEPARTMENTS, 1).errors).toEqual([]);

    const twoSecondaries = row({ secondaryManagerEmail1: "a@example.com", secondaryManagerEmail3: "b@example.com" });
    expect(validateAndMap(twoSecondaries, DEPARTMENTS, 2).errors).toEqual([]);
    expect(validateAndMap(twoSecondaries, DEPARTMENTS, 1).errors).toEqual([
      "this row names 2 secondary managers; your organisation allows at most 1",
    ]);
    expect(validateAndMap(row({ secondaryManagerEmail2: "b@example.com" }), DEPARTMENTS, 0).errors).toEqual([
      "your organisation does not use secondary managers",
    ]);
  });

  it("refuses a blank-primary row naming the policy's default as a secondary, once the policy is loaded", () => {
    const dana = { userId: "u-d", name: "Dana Default", email: "Dana@Example.com" };
    const message =
      "Dana Default is your organisation's default reporting manager and will be assigned as primary. Pick the primary explicitly or choose a different additional manager.";
    expect(validateAndMap(row({ secondaryManagerEmail2: "dana@example.com" }), DEPARTMENTS, 3, dana).errors).toEqual([message]);
    // An explicit primary, another secondary, or an unknown policy: nothing to say.
    expect(validateAndMap(row({ primaryManagerEmail: "p@example.com", secondaryManagerEmail1: "dana@example.com" }), DEPARTMENTS, 3, dana).errors).toEqual([]);
    expect(validateAndMap(row({ secondaryManagerEmail1: "other@example.com" }), DEPARTMENTS, 3, dana).errors).toEqual([]);
    expect(validateAndMap(row({ secondaryManagerEmail1: "dana@example.com" }), DEPARTMENTS, null, null).errors).toEqual([]);
  });

  it("leaves the cap to the server preview while the policy is unknown", () => {
    const three = row({ secondaryManagerEmail1: "a@example.com", secondaryManagerEmail2: "b@example.com", secondaryManagerEmail3: "c@example.com" });
    expect(validateAndMap(three, DEPARTMENTS, null).errors).toEqual([]);
  });

  it("refuses malformed manager emails and dates", () => {
    const errors = validateAndMap(row({ primaryManagerEmail: "boss", effectiveFrom: "2026-02-30" }), DEPARTMENTS).errors;
    expect(errors).toEqual(["invalid primaryManagerEmail", "invalid effectiveFrom (use YYYY-MM-DD)"]);
  });

  it("sends a primary read from a legacy header as reportingManagerEmail, so the server records legacyManagerHeader", () => {
    const legacy = validateAndMap(row({ primaryManagerEmail: "Boss@Example.com", [LEGACY_PRIMARY_KEY]: "reportsTo" }), DEPARTMENTS);
    expect(legacy.errors).toEqual([]);
    expect(legacy.payload).toMatchObject({ reportingManagerEmail: "boss@example.com" });
    expect(legacy.payload).not.toHaveProperty("primaryManagerEmail");

    const canonical = validateAndMap(row({ primaryManagerEmail: "boss@example.com" }), DEPARTMENTS);
    expect(canonical.payload).toMatchObject({ primaryManagerEmail: "boss@example.com" });
    expect(canonical.payload).not.toHaveProperty("reportingManagerEmail");
  });

  it("refuses a row whose canonical and legacy manager headers disagree", () => {
    const errors = validateAndMap(row({ primaryManagerEmail: "a@example.com", [CONFLICT_KEY]: "primaryManagerEmail" }), DEPARTMENTS).errors;
    expect(errors[0]).toMatch(/^MANAGER_COLUMN_CONFLICT/);
  });
});
