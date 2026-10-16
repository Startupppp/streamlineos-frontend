export const LOP_HINT_PREFIX = "Hint";

export interface LopHintInput {
  typeName: string | null;
  entitledDaysPerYear: number | null;
  requestedDays: number;
}

export function leaveLopHint(input: LopHintInput): string | null {
  if (input.requestedDays <= 0) return null;
  if (input.entitledDaysPerYear !== 0) return null;
  const subject = input.typeName ?? "This leave type";
  return `${LOP_HINT_PREFIX} · ${subject} carries no paid entitlement, so it may affect LOP. Payroll decides the final outcome.`;
}

export function leaveBalanceError(input: {
  typeName: string;
  entitledDaysPerYear: number | null;
  availableDays: number | null;
  requestedDays: number;
}): string | null {
  if (input.entitledDaysPerYear === 0 || input.availableDays === null) return null;
  if (input.requestedDays <= input.availableDays) return null;
  const plural = (n: number) => `${n} day${n !== 1 ? "s" : ""}`;
  return `Requested ${plural(input.requestedDays)} exceeds your available ${plural(Math.max(0, input.availableDays))} of ${input.typeName}. Shorten the dates or pick another leave type.`;
}
