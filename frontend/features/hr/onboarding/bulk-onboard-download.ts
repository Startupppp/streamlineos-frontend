import { downloadXlsx } from "@/lib/export/xlsx-utils";
import { BULK_ONBOARD_COLUMNS, MAX_ROWS } from "./bulk-onboard-template";

export async function downloadBulkOnboardTemplate(departmentNames: string[] = []) {
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

  const instructionRows = [
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
      field: "Limits",
      required: "",
      notes: `Up to ${MAX_ROWS} employees per upload. Keep header row as-is. Delete the sample row before importing production data if needed.`,
    },
  ];

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
        { header: "Field", key: "field", width: 22 },
        { header: "Required", key: "required", width: 12 },
        { header: "Notes", key: "notes", width: 70 },
      ],
      rows: instructionRows,
    },
  ]);
}
