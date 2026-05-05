/**
 * Standard Indian payslip PDF password convention.
 *
 *   first 4 letters of PAN (uppercase) + DDMM of date of birth
 *   e.g. PAN ABCDE1234F + DOB 1995-10-05  →  ABCD0510
 *
 * If PAN is missing → fall back to first 4 of employee name + DDMM.
 * If DOB is missing → fall back to PAN[0:4] + first-4 of joiningDate DDMM.
 * If both missing → null (caller should not encrypt).
 *
 * This is an industry convention used by every major Indian payroll system
 * (Razorpay, Zoho People, Keka, etc.). Employees are expected to know it.
 */
export function derivePayslipPassword(input: {
  panNumber?: string | null;
  dateOfBirth?: string | Date | null;
  employeeName?: string | null;
  joiningDate?: string | Date | null;
}): string | null {
  const dobPart = formatDDMM(input.dateOfBirth) ?? formatDDMM(input.joiningDate);
  const namePart =
    (input.panNumber ?? "").replace(/[^A-Z]/gi, "").slice(0, 4).toUpperCase() ||
    (input.employeeName ?? "").replace(/[^A-Z]/gi, "").slice(0, 4).toUpperCase();

  if (!dobPart || !namePart || namePart.length < 4) return null;
  return `${namePart}${dobPart}`;
}

function formatDDMM(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}${mm}`;
}

export const PAYSLIP_PASSWORD_HINT =
  "First 4 characters of your PAN (uppercase) followed by DDMM of your date of birth. " +
  "Example: PAN ABCDE1234F + DOB 5 Oct 1995 → password ABCD0510";
