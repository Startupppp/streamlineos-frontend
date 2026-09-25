import { BULK_ONBOARD_COLUMNS } from "./bulk-onboard-columns";
import { buildBulkOnboardInstructionRows } from "./bulk-onboard-download";

/**
 * HRMS-E2E-002c. The template's Employees sheet carried reportingManagerEmail
 * and topLevelRoleReason; the Instructions sheet beside it documented every
 * other column and not those two. So the two fields that decide whether a row
 * can be created at all were the only ones nobody was told about — which is why
 * QA filled a sheet that failed five rows on a manager they had supplied.
 *
 * This asserts the two sheets describe the same file, which is the property that
 * was broken rather than either field individually.
 */
describe("bulk onboard template instructions", () => {
  it("documents every column the template writes", () => {
    const documented = new Set(buildBulkOnboardInstructionRows([]).map((row) => row.field));
    const undocumented = BULK_ONBOARD_COLUMNS.map((c) => c.key).filter((key) => !documented.has(key));
    expect(undocumented).toEqual([]);
  });

  it("says a manager may be another row of the same file, and blank means fallback", () => {
    const row = buildBulkOnboardInstructionRows([]).find((entry) => entry.field === "primaryManagerEmail");
    expect(row?.notes).toMatch(/same file/i);
    expect(row?.notes).toMatch(/fallback policy/i);
    expect(row?.notes).toMatch(/reportingManagerEmail is still read/i);
  });

  it("says top-level and manager columns are alternatives, not both", () => {
    const row = buildBulkOnboardInstructionRows([]).find((entry) => entry.field === "topLevelRoleReason");
    expect(row?.notes).toMatch(/never both/i);
  });

  it("gives selected, fallback and top-level examples", () => {
    const fields = buildBulkOnboardInstructionRows([]).map((entry) => entry.field);
    expect(fields).toEqual(expect.arrayContaining(["Example: selected", "Example: fallback", "Example: top-level"]));
  });

  it("states the organisation's secondary-manager cap per slot", () => {
    const rows = buildBulkOnboardInstructionRows([], 1);
    expect(rows.find((entry) => entry.field === "secondaryManagerEmail1")?.notes).toMatch(/dotted-line/i);
    expect(rows.find((entry) => entry.field === "secondaryManagerEmail2")?.notes).toMatch(/at most 1 secondary manager/);
    expect(buildBulkOnboardInstructionRows([], 0).find((entry) => entry.field === "secondaryManagerEmail1")?.notes).toMatch(/Not used/);
  });

  it("names the org's own departments when it knows them", () => {
    const row = buildBulkOnboardInstructionRows(["Engineering", "QA Testing"]).find(
      (entry) => entry.field === "department",
    );
    expect(row?.notes).toContain("Engineering");
  });
});
