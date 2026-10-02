export const LOP_HINT_PREFIX = "Hint";

export interface LopHintInput {
  typeName: string | null;
  entitledDaysPerYear: number | null;
  balanceKnown: boolean;
  availableDays: number | null;
  requestedDays: number;
}

export function leaveLopHint(input: LopHintInput): string | null {
  if (input.requestedDays <= 0) return null;
  const subject = input.typeName ?? "This leave type";

  if (input.entitledDaysPerYear === 0) {
    return `${LOP_HINT_PREFIX} · ${subject} carries no paid entitlement, so it may affect LOP. Payroll decides the final outcome.`;
  }

  if (
    input.balanceKnown &&
    input.availableDays !== null &&
    input.requestedDays > input.availableDays
  ) {
    return `${LOP_HINT_PREFIX} · This request goes past your remaining ${subject} balance, so it may affect LOP. Payroll decides the final outcome.`;
  }

  return null;
}
