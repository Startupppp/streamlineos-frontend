import type { BulkOnboardEmployeeRow } from "@/types/hr";
import { isUserInviteRole } from "@/lib/constants/user-invite-roles";

/** Canonical template columns — keep in sync with backend bulkOnboardEmployeeRowSchema. */
export const BULK_ONBOARD_COLUMNS = [
  {
    key: "firstName",
    header: "firstName",
    required: true,
    width: 16,
    sample: "Priya",
  },
  {
    key: "lastName",
    header: "lastName",
    required: true,
    width: 16,
    sample: "Sharma",
  },
  {
    key: "email",
    header: "email",
    required: true,
    width: 28,
    sample: "priya.sharma@company.com",
  },
  {
    key: "phone",
    header: "phone",
    required: false,
    width: 16,
    sample: "+919876543210",
  },
  {
    key: "gender",
    header: "gender",
    required: false,
    width: 12,
    sample: "FEMALE",
  },
  {
    key: "designation",
    header: "designation",
    required: true,
    width: 20,
    sample: "Software Engineer",
  },
  {
    key: "department",
    header: "department",
    required: true,
    width: 18,
    sample: "Engineering",
  },
  {
    key: "role",
    header: "role",
    required: false,
    width: 16,
    sample: "MEMBER",
  },
  {
    key: "employeeId",
    header: "employeeId",
    required: false,
    width: 14,
    sample: "EMP-001",
  },
  {
    key: "joiningDate",
    header: "joiningDate",
    required: false,
    width: 14,
    sample: "2026-04-01",
  },
  {
    key: "dateOfBirth",
    header: "dateOfBirth",
    required: false,
    width: 14,
    sample: "1995-06-15",
  },
  {
    key: "taxId",
    header: "taxId",
    required: false,
    width: 14,
    sample: "ABCDE1234F",
  },
  {
    key: "monthlySalary",
    header: "monthlySalary",
    required: false,
    width: 14,
    sample: "75000",
  },
  {
    key: "bankAccountNumber",
    header: "bankAccountNumber",
    required: false,
    width: 18,
    sample: "123456789012",
  },
  {
    key: "bankName",
    header: "bankName",
    required: false,
    width: 16,
    sample: "HDFC Bank",
  },
  {
    key: "bankBranch",
    header: "bankBranch",
    required: false,
    width: 14,
    sample: "Koramangala",
  },
  {
    key: "ifsc",
    header: "ifsc",
    required: false,
    width: 14,
    sample: "HDFC0001234",
  },
  {
    key: "accountHolder",
    header: "accountHolder",
    required: false,
    width: 18,
    sample: "Priya Sharma",
  },
  {
    key: "pfUanNumber",
    header: "pfUanNumber",
    required: false,
    width: 14,
    sample: "100123456789",
  },
] as const;

export type ColumnKey = (typeof BULK_ONBOARD_COLUMNS)[number]["key"];

export type ParsedRow = Record<string, string>;

export interface PreviewRow {
  _idx: number;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  department: string;
  phone: string;
  joiningDate: string;
  valid: boolean;
  errors: string[];
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GENDER_VALUES = new Set(["MALE", "FEMALE", "OTHER"]);
export const MAX_ROWS = 100;

const HEADER_ALIASES: Record<string, ColumnKey> = {
  firstname: "firstName",
  "first name": "firstName",
  first_name: "firstName",
  lastname: "lastName",
  "last name": "lastName",
  last_name: "lastName",
  email: "email",
  "e-mail": "email",
  phone: "phone",
  mobile: "phone",
  gender: "gender",
  designation: "designation",
  title: "designation",
  "job title": "designation",
  department: "department",
  "department name": "department",
  departmentid: "department",
  "department id": "department",
  role: "role",
  employeeid: "employeeId",
  "employee id": "employeeId",
  employee_id: "employeeId",
  joiningdate: "joiningDate",
  "joining date": "joiningDate",
  join_date: "joiningDate",
  dateofbirth: "dateOfBirth",
  "date of birth": "dateOfBirth",
  dob: "dateOfBirth",
  taxid: "taxId",
  "tax id": "taxId",
  pan: "taxId",
  monthlysalary: "monthlySalary",
  "monthly salary": "monthlySalary",
  salary: "monthlySalary",
  bankaccountnumber: "bankAccountNumber",
  "bank account number": "bankAccountNumber",
  "account number": "bankAccountNumber",
  bankname: "bankName",
  "bank name": "bankName",
  bankbranch: "bankBranch",
  "bank branch": "bankBranch",
  branch: "bankBranch",
  ifsc: "ifsc",
  accountholder: "accountHolder",
  "account holder": "accountHolder",
  pfuanumber: "pfUanNumber",
  "pf uan number": "pfUanNumber",
  uan: "pfUanNumber",
};

export function normalizeHeader(h: string): ColumnKey | null {
  const key = h
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  const exact = BULK_ONBOARD_COLUMNS.find(
    (c) => c.key.toLowerCase() === key.replace(/\s/g, ""),
  );
  return exact?.key ?? null;
}

function cell(row: ParsedRow, key: ColumnKey): string {
  return (row[key] ?? "").trim();
}

export function validateAndMap(
  raw: ParsedRow,
  deptNames: Set<string>,
): {
  payload: BulkOnboardEmployeeRow | null;
  errors: string[];
  preview: Omit<PreviewRow, "_idx">;
} {
  const errors: string[] = [];
  const firstName = cell(raw, "firstName");
  const lastName = cell(raw, "lastName");
  const email = cell(raw, "email").toLowerCase();
  const designation = cell(raw, "designation");
  const department = cell(raw, "department");
  const phone = cell(raw, "phone");
  const genderRaw = cell(raw, "gender").toUpperCase();
  const roleRaw = cell(raw, "role").toUpperCase();
  const employeeId = cell(raw, "employeeId");
  const joiningDate = cell(raw, "joiningDate");
  const dateOfBirth = cell(raw, "dateOfBirth");
  const taxId = cell(raw, "taxId");
  const monthlySalaryRaw = cell(raw, "monthlySalary");
  const bankAccountNumber = cell(raw, "bankAccountNumber");
  const bankName = cell(raw, "bankName");
  const bankBranch = cell(raw, "bankBranch");
  const ifsc = cell(raw, "ifsc");
  const accountHolder = cell(raw, "accountHolder");
  const pfUanNumber = cell(raw, "pfUanNumber");

  if (!firstName) errors.push("firstName is required");
  if (!lastName) errors.push("lastName is required");
  if (!email) errors.push("email is required");
  else if (!EMAIL_RE.test(email)) errors.push("invalid email");
  if (!designation) errors.push("designation is required");
  if (!department) errors.push("department is required");
  else if (
    deptNames.size > 0 &&
    !deptNames.has(department.toLowerCase()) &&
    !/^\d+$/.test(department)
  ) {
    errors.push(
      `unknown department "${department}" — use an Organization department name or code`,
    );
  }
  if (genderRaw && !GENDER_VALUES.has(genderRaw)) {
    errors.push("gender must be MALE, FEMALE, or OTHER");
  }
  if (roleRaw && !isUserInviteRole(roleRaw)) {
    errors.push("role must be MEMBER or ORG_ADMIN");
  }

  if (dateOfBirth) {
    const dob = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? new Date(`${dateOfBirth}T00:00:00`)
      : new Date(dateOfBirth);
    const minAgeMs = 16 * 365.25 * 24 * 60 * 60 * 1000;
    if (Number.isNaN(dob.getTime())) {
      errors.push("invalid dateOfBirth (use YYYY-MM-DD)");
    } else if (dob >= new Date()) {
      errors.push("dateOfBirth cannot be in the future");
    } else if (Date.now() - dob.getTime() < minAgeMs) {
      errors.push("Employee must be at least 16 years old");
    }
  }

  let monthlySalary: number | undefined;
  if (monthlySalaryRaw) {
    const n = Number(monthlySalaryRaw.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) errors.push("invalid monthlySalary");
    else monthlySalary = n;
  }

  const departmentName: string | undefined = department || undefined;

  const preview = {
    firstName,
    lastName,
    email,
    designation,
    department,
    phone,
    joiningDate,
    valid: errors.length === 0,
    errors,
  };

  if (errors.length > 0) {
    return { payload: null, errors, preview };
  }

  const hasBank =
    bankAccountNumber ||
    bankName ||
    bankBranch ||
    ifsc ||
    accountHolder ||
    pfUanNumber;

  const payload: BulkOnboardEmployeeRow = {
    firstName,
    lastName,
    email,
    designation,
    ...(departmentName ? { department: departmentName } : {}),
    ...(phone ? { phone } : {}),
    ...(genderRaw ? { gender: genderRaw as "MALE" | "FEMALE" | "OTHER" } : {}),
    ...(roleRaw ? { role: roleRaw } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(joiningDate ? { joiningDate } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(taxId ? { taxId } : {}),
    ...(monthlySalary != null ? { monthlySalary } : {}),
    ...(hasBank
      ? {
          bankDetails: {
            ...(bankAccountNumber ? { accountNumber: bankAccountNumber } : {}),
            ...(bankName ? { bankName } : {}),
            ...(bankBranch ? { branch: bankBranch } : {}),
            ...(ifsc ? { ifsc } : {}),
            ...(accountHolder ? { accountHolder } : {}),
            ...(pfUanNumber ? { pfUanNumber } : {}),
          },
        }
      : {}),
  };

  return { payload, errors, preview };
}

function formatLocalDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function excelCellToString(cell: { text?: string; value?: unknown }): string {
  const value = cell.value;
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    return formatLocalDate(value);
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    const result = (value as { result?: unknown }).result;
    if (result instanceof Date) return formatLocalDate(result);
    if (result != null) return String(result).trim();
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text: string }).text ?? "").trim();
  }
  if (typeof value === "object" && value !== null && "richText" in value) {
    const parts = (value as { richText: Array<{ text?: string }> }).richText;
    return parts
      .map((p) => p.text ?? "")
      .join("")
      .trim();
  }
  const text = cell.text;
  if (text != null && String(text).trim() !== "") return String(text).trim();
  return String(value).trim();
}

function mapRawRows(
  headers: string[],
  data: Record<string, string>[],
): ParsedRow[] {
  const keyMap = new Map<string, ColumnKey>();
  for (const h of headers) {
    const mapped = normalizeHeader(h);
    if (mapped) keyMap.set(h, mapped);
  }

  return data.map((row) => {
    const out: ParsedRow = {};
    for (const [header, value] of Object.entries(row)) {
      const key = keyMap.get(header) ?? normalizeHeader(header);
      if (key) out[key] = value ?? "";
    }
    return out;
  });
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  if (file.name.endsWith(".csv") || file.type === "text/csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    return mapRawRows(result.meta.fields ?? [], result.data);
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet =
    workbook.getWorksheet("Employees") ?? workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheet found in file");

  const firstRow = worksheet.getRow(1);
  const headers: string[] = [];
  firstRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.text ?? "").trim();
  });

  const dataRows: Record<string, string>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const entry: Record<string, string> = {};
    let empty = true;
    headers.forEach((header, idx) => {
      if (!header) return;
      const val = excelCellToString(row.getCell(idx + 1));
      if (val) empty = false;
      entry[header] = val;
    });
    if (!empty) dataRows.push(entry);
  });

  return mapRawRows(headers.filter(Boolean), dataRows);
}
