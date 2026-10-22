export const WITHDRAWAL_CODE_UNEXPLAINED = "manual";
export const WITHDRAWAL_CODE_NOT_SHAREABLE = "source_no_longer_publishable";

export function humanWithdrawalReason(reason: string | null): string | null {
  if (reason === null || reason === WITHDRAWAL_CODE_UNEXPLAINED || reason === WITHDRAWAL_CODE_NOT_SHAREABLE) return null;
  const trimmed = reason.trim();
  return trimmed === "" ? null : trimmed;
}
