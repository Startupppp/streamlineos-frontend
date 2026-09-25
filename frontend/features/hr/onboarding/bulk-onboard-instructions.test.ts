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

  it("says a manager may be another row of the same file", () => {
    const row = buildBulkOnboardInstructionRows([]).find(
      (entry) => entry.field === "reportingManagerEmail",
    );
    expect(row?.notes).toMatch(/same file/i);
  });

  it("says the two manager fields are alternatives, not both", () => {
    const row = buildBulkOnboardInstructionRows([]).find(
      (entry) => entry.field === "topLevelRoleReason",
    );
    expect(row?.notes).toMatch(/never both/i);
  });

  it("names the org's own departments when it knows them", () => {
    const row = buildBulkOnboardInstructionRows(["Engineering", "QA Testing"]).find(
      (entry) => entry.field === "department",
    );
    expect(row?.notes).toContain("Engineering");
  });
});
