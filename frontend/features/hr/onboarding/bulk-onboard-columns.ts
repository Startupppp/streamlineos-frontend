import { resolveManagerHeader } from "@/components/hr/reporting-lines/manager-columns";
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
    key: "primaryManagerEmail",
    header: "primaryManagerEmail",
    required: false,
    width: 28,
    sample: "manager@company.com",
  },
  {
    key: "secondaryManagerEmail1",
    header: "secondaryManagerEmail1",
    required: false,
    width: 26,
    sample: "",
  },
  {
    key: "secondaryManagerEmail2",
    header: "secondaryManagerEmail2",
    required: false,
    width: 26,
    sample: "",
  },
  {
    key: "secondaryManagerEmail3",
    header: "secondaryManagerEmail3",
    required: false,
    width: 26,
    sample: "",
  },
  {
    key: "topLevelRoleReason",
    header: "topLevelRoleReason",
    required: false,
    width: 24,
    sample: "",
  },
  {
    key: "effectiveFrom",
    header: "effectiveFrom",
    required: false,
    width: 14,
    sample: "",
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

/**
 * Set on a parsed row when two headers fill the same column with different
 * values (e.g. `primaryManagerEmail` and legacy `reportsTo`). Guessing which the
 * operator meant would silently pick a manager, so the row is refused instead.
 */
export const CONFLICT_KEY = "__conflictingColumns";

/**
 * Set on a parsed row whose primary manager came from a legacy header
 * (`reportsTo` …). The payload then carries it as `reportingManagerEmail`, the
 * backend's read-only alias, so the server records `legacyManagerHeader`.
 */
export const LEGACY_PRIMARY_KEY = "__legacyPrimaryHeader";

export const MAX_ROWS = 100;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  effectivefrom: "effectiveFrom",
  "effective from": "effectiveFrom",
  "effective date": "effectiveFrom",
  toplevelrolereason: "topLevelRoleReason",
  "top level role reason": "topLevelRoleReason",
  "top-level role reason": "topLevelRoleReason",
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

/** Manager headers resolve through the one shared alias map; everything else here. */
export function normalizeHeader(h: string): ColumnKey | null {
  const manager = resolveManagerHeader(h);
  if (manager) return manager.column;
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
