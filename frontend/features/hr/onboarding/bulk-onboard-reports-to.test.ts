import { BULK_ONBOARD_COLUMNS, normalizeHeader, type ParsedRow } from "./bulk-onboard-columns";
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

describe("bulk onboarding rows must say who the employee reports to", () => {
  it("lists the manager email as a required template column", () => {
    expect(BULK_ONBOARD_COLUMNS.find((column) => column.key === "reportingManagerEmail")?.required).toBe(true);
  });

  it("maps a manager email and canonicalises it", () => {
    const result = validateAndMap(row({ reportingManagerEmail: "Boss@Example.com" }), DEPARTMENTS);

    expect(result.errors).toEqual([]);
    expect(result.payload?.reportingManagerEmail).toBe("boss@example.com");
    expect(result.payload?.topLevelRole).toBeUndefined();
  });

  it("maps a top-level reason to the documented exception", () => {
    const result = validateAndMap(row({ topLevelRoleReason: "Founder" }), DEPARTMENTS);

    expect(result.errors).toEqual([]);
    expect(result.payload).toMatchObject({ topLevelRole: true, topLevelRoleReason: "Founder" });
  });

  it("rejects a row with neither, and a row with both", () => {
    expect(validateAndMap(row({}), DEPARTMENTS).errors).toEqual([
      "reportingManagerEmail is required (or topLevelRoleReason for a top-level role)",
    ]);
    expect(
      validateAndMap(row({ reportingManagerEmail: "boss@example.com", topLevelRoleReason: "CEO" }), DEPARTMENTS).errors,
    ).toEqual(["a top-level role cannot also have a reportingManagerEmail"]);
  });

  it("recognises the spreadsheet header aliases people actually type", () => {
    expect(normalizeHeader("Reports To")).toBe("reportingManagerEmail");
    expect(normalizeHeader("Manager Email")).toBe("reportingManagerEmail");
    expect(normalizeHeader("Top-level role reason")).toBe("topLevelRoleReason");
  });
});
