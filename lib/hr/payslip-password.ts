/**
 * OPEN-01: Payslip PDF password = employee date of birth only (HR onboarding field `users.dateOfBirth`).
 * Format: DDMMYYYY (e.g. 5 Oct 1995 → 05101995).
 */
export function derivePayslipPassword(input: { dateOfBirth?: string | Date | null }): string | null {
  return formatDDMMYYYY(input.dateOfBirth);
}

function formatDDMMYYYY(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const dd = String(value.getUTCDate()).padStart(2, "0");
    const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(value.getUTCFullYear());
    return `${dd}${mm}${yyyy}`;
  }
  const head = value.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(head);
  if (!m) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getUTCFullYear());
    return `${dd}${mm}${yyyy}`;
  }
  const yyyy = m[1];
  const mm = m[2];
  const dd = m[3];
  return `${dd}${mm}${yyyy}`;
}

export const PAYSLIP_PASSWORD_HINT =
  "Your payslip PDF password is your date of birth in DDMMYYYY format (as recorded in HR onboarding). " +
  "Example: 5 October 1995 → 05101995.";
