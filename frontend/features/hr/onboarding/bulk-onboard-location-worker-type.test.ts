import { BULK_ONBOARD_COLUMNS, normalizeHeader, type ParsedRow } from "./bulk-onboard-columns";
import { validateAndMap } from "./bulk-onboard-template";
import { buildBulkOnboardInstructionRows } from "./bulk-onboard-download";

/**
 * BUG-HRMS-006 / BUG-HRMS-007. The template had no column for either field, so a
 * bulk upload could not place a hire at one of the org's offices or record them
 * as anything but FULL_TIME.
 *
 * The location is deliberately not resolved here: the server refuses an unknown
 * office rather than creating one, and a name typed in a spreadsheet is exactly
 * the case where inventing an office would be worse than refusing the row.
 */

const DEPARTMENTS = new Set(["engineering"]);

function row(extra: ParsedRow): ParsedRow {
  return {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    designation: "Software Engineer",
    department: "Engineering",
    primaryManagerEmail: "manager@example.com",
    ...extra,
  };
}

describe("the bulk onboarding template carries a location and a worker type", () => {
  it("writes both columns, so the downloaded file has somewhere to put them", () => {
    const keys = BULK_ONBOARD_COLUMNS.map((column) => column.key);

    expect(keys).toContain("location");
    expect(keys).toContain("workerType");
  });

  it("documents both columns on the Instructions sheet", () => {
    const documented = buildBulkOnboardInstructionRows([]).map((entry) => entry.field);

    expect(documented).toContain("location");
    expect(documented).toContain("workerType");
  });

  it("accepts the headers an operator is likely to type", () => {
    expect(normalizeHeader("Work Location")).toBe("location");
    expect(normalizeHeader("office")).toBe("location");
    expect(normalizeHeader("Employment Type")).toBe("workerType");
    expect(normalizeHeader("worker_type")).toBe("workerType");
  });

  it("passes the office name through for the server to resolve", () => {
    const result = validateAndMap(row({ location: "Bengaluru HQ" }), DEPARTMENTS);

    expect(result.errors).toEqual([]);
    expect(result.payload?.location).toBe("Bengaluru HQ");
  });

  it("normalises the worker type's case", () => {
    const result = validateAndMap(row({ workerType: "contractor" }), DEPARTMENTS);

    expect(result.errors).toEqual([]);
    expect(result.payload?.workerType).toBe("CONTRACTOR");
  });

  it("refuses a worker type the column's enum does not have", () => {
    const result = validateAndMap(row({ workerType: "PERMANENT" }), DEPARTMENTS);

    expect(result.payload).toBeNull();
    expect(result.errors.join(" ")).toMatch(/workerType must be one of/);
  });

  it("sends neither field when the file names neither, so an old file still uploads", () => {
    const result = validateAndMap(row({}), DEPARTMENTS);

    expect(result.errors).toEqual([]);
    expect(result.payload).not.toHaveProperty("location");
    expect(result.payload).not.toHaveProperty("workerType");
  });
});
