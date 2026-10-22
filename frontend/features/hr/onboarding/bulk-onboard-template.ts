import type { BulkOnboardEmployeeRow } from "@/types/hr";
import { isUserInviteRole } from "@/lib/constants/user-invite-roles";
import { HR_WORKER_TYPE_VALUES, isHrWorkerType } from "@/lib/constants/hr-worker-types";
import { EMAIL_RE, type ColumnKey, type ParsedRow } from "./bulk-onboard-columns";
import { validateManagerColumns } from "./bulk-onboard-managers";
import type { AssignedDefault } from "@/components/hr/reporting-lines/policy-default-primary";

const PHONE_RE = /^\+?[\d\s\-()+.]{6,}$/;

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

export const GENDER_VALUES = new Set(["MALE", "FEMALE", "OTHER"]);

function isGender(value: string): value is "MALE" | "FEMALE" | "OTHER" {
  return GENDER_VALUES.has(value);
}

function cell(row: ParsedRow, key: ColumnKey): string {
  return (row[key] ?? "").trim();
}

export function validateAndMap(
  raw: ParsedRow,
  deptNames: Set<string>,
  secondaryCap: number | null = null,
  assignedDefault: AssignedDefault | null = null,
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
  const location = cell(raw, "location");
  const workerTypeRaw = cell(raw, "workerType").toUpperCase();
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
  if (workerTypeRaw && !isHrWorkerType(workerTypeRaw)) {
    errors.push(`workerType must be one of ${HR_WORKER_TYPE_VALUES.join(", ")}`);
  }
  const managers = validateManagerColumns(raw, email, secondaryCap, assignedDefault);
  errors.push(...managers.errors);

  if (joiningDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(joiningDate)) {
      errors.push("invalid joiningDate format (use YYYY-MM-DD)");
    } else {
      const jd = new Date(`${joiningDate}T00:00:00`);
      if (Number.isNaN(jd.getTime())) {
        errors.push("invalid joiningDate (use YYYY-MM-DD)");
      }
    }
  }

  if (phone && !PHONE_RE.test(phone)) {
    errors.push("invalid phone number");
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
    ...(location ? { location } : {}),
    ...(isHrWorkerType(workerTypeRaw) ? { workerType: workerTypeRaw } : {}),
    ...(phone ? { phone } : {}),
    ...(isGender(genderRaw) ? { gender: genderRaw } : {}),
    ...(roleRaw ? { role: roleRaw } : {}),
    ...managers.fields,
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
