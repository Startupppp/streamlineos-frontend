import { downloadXlsx } from "@/lib/export/xlsx-utils";
import { BULK_ONBOARD_COLUMNS, MAX_ROWS } from "./bulk-onboard-columns";

function secondaryNote(slot: number, cap: number): string {
  if (cap === 0) return "Not used: your organisation records no secondary managers. Leave blank.";
  if (slot > cap) return `Not used: your organisation allows at most ${cap} secondary manager${cap === 1 ? "" : "s"}. Leave blank.`;
  return "Optional dotted-line (functional/project) manager. Informational only — never approves leave, time or expenses. Same rules as primaryManagerEmail; must differ from it.";
}

/**
 * The Instructions sheet, extracted so a test can hold it against the columns.
 *
 * The two sheets drifted apart once already: the Employees sheet carried
 * reportingManagerEmail and topLevelRoleReason and this list documented every
 * other column, so the two fields that decide whether a row can be created at
 * all were the only ones nobody was told about.
 */
export function buildBulkOnboardInstructionRows(
  departmentNames: string[],
  /** The organisation's `maxSecondaryManagersPerEmployee`; the server re-checks it. */
  secondaryCap = 0,
): Array<{ field: string; required: string; notes: string }> {
  return [
    { field: "firstName", required: "Yes", notes: "Employee first name" },
    { field: "lastName", required: "Yes", notes: "Employee last name" },
    { field: "email", required: "Yes", notes: "Work email — must be unique in the org" },
    { field: "phone", required: "No", notes: "Phone with country code preferred" },
    { field: "gender", required: "No", notes: "MALE, FEMALE, or OTHER" },
    { field: "designation", required: "Yes", notes: "Job title (e.g. Software Engineer)" },
    {
      field: "department",
      required: "Yes",
      notes: departmentNames.length
        ? `Exact department name. Yours: ${departmentNames.join(", ")}`
        : "Exact department name as configured in HR (or numeric department id)",
    },
    {
      field: "primaryManagerEmail",
      required: "No",
      notes:
        "The one accountable reporting manager: approves leave, time and expenses. May be an active member of the organization OR another row of this same file — put the manager anywhere in the sheet and they will be created first. Leave blank and your organisation's fallback policy assigns one; the preview names that person before anything is created. A chain that loops back on itself is refused. The old header reportingManagerEmail is still read for one release.",
    },
    { field: "secondaryManagerEmail1", required: "No", notes: secondaryNote(1, secondaryCap) },
    { field: "secondaryManagerEmail2", required: "No", notes: secondaryNote(2, secondaryCap) },
    { field: "secondaryManagerEmail3", required: "No", notes: secondaryNote(3, secondaryCap) },
    {
      field: "topLevelRoleReason",
      required: "Only for someone with no manager",
      notes:
        "Why this person reports to nobody — e.g. 'Founder'. Give this OR manager emails, never both.",
    },
    {
      field: "effectiveFrom",
      required: "No",
      notes: "YYYY-MM-DD the reporting line starts. Blank means today in your organisation's time zone.",
    },
    { field: "role", required: "No", notes: "MEMBER or ORG_ADMIN (default MEMBER)" },
    { field: "employeeId", required: "No", notes: "External employee code" },
    { field: "joiningDate", required: "No", notes: "YYYY-MM-DD" },
    { field: "dateOfBirth", required: "No", notes: "YYYY-MM-DD — employee must be 16+" },
    { field: "taxId", required: "No", notes: "PAN format e.g. ABCDE1234F" },
    { field: "monthlySalary", required: "No", notes: "Number only, no currency symbol" },
    { field: "bankAccountNumber", required: "No", notes: "9–18 digits" },
    { field: "bankName", required: "No", notes: "Bank name" },
    { field: "bankBranch", required: "No", notes: "Branch name" },
    { field: "ifsc", required: "No", notes: "e.g. HDFC0001234" },
    { field: "accountHolder", required: "No", notes: "Name on the bank account" },
    { field: "pfUanNumber", required: "No", notes: "12-digit UAN" },
    { field: "", required: "", notes: "" },
    {
      field: "Example: selected",
      required: "",
      notes: "primaryManagerEmail = lead@company.com → reports to that member (or to the row with that email).",
    },
    {
      field: "Example: fallback",
      required: "",
      notes:
        "primaryManagerEmail blank, topLevelRoleReason blank → assigned by your fallback policy (the configured default manager, or you as the uploading HR admin). Marked 'Fallback' in the preview with the person's name, and shown to HR until confirmed or replaced.",
    },
    {
      field: "Example: top-level",
      required: "",
      notes: "topLevelRoleReason = Founder, every manager column blank → no reporting manager, on purpose.",
    },
    { field: "", required: "", notes: "" },
    {
      field: "Limits",
      required: "",
      notes: `Up to ${MAX_ROWS} employees per upload. Keep header row as-is. Delete the sample row before importing production data if needed.`,
    },
  ];
}

export async function downloadBulkOnboardTemplate(departmentNames: string[] = [], secondaryCap = 0) {
  const sampleRow: Record<string, unknown> = {};
  for (const col of BULK_ONBOARD_COLUMNS) {
    sampleRow[col.key] = col.sample;
  }
  if (departmentNames[0]) {
    sampleRow.department = departmentNames[0];
  }

  const blankRow: Record<string, unknown> = {};
  for (const col of BULK_ONBOARD_COLUMNS) {
    blankRow[col.key] = "";
  }

  await downloadXlsx("employee-onboard-template.xlsx", [
    {
      name: "Employees",
      columns: BULK_ONBOARD_COLUMNS.map((c) => ({
        header: c.header,
        key: c.key,
        width: c.width,
      })),
      rows: [sampleRow, blankRow, blankRow],
    },
    {
      name: "Instructions",
      columns: [
        { header: "Field", key: "field", width: 24 },
        { header: "Required", key: "required", width: 12 },
        { header: "Notes", key: "notes", width: 70 },
      ],
      rows: buildBulkOnboardInstructionRows(departmentNames, secondaryCap),
    },
  ]);
}
