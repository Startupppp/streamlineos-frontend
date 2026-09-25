/** The codes the server writes when nobody gave a reason: a person withdrew it without one, or the document stopped being shareable. */
export const WITHDRAWAL_CODE_UNEXPLAINED = "manual";
export const WITHDRAWAL_CODE_NOT_SHAREABLE = "source_no_longer_publishable";

/**
 * What a publisher wrote when they withdrew an entry, or null when the stored text is one of the server's own codes.
 * The reason and the codes share one field, so a code must never be shown as if a person had written it.
 */
export function humanWithdrawalReason(reason: string | null): string | null {
  if (reason === null || reason === WITHDRAWAL_CODE_UNEXPLAINED || reason === WITHDRAWAL_CODE_NOT_SHAREABLE) return null;
  const trimmed = reason.trim();
  return trimmed === "" ? null : trimmed;
}
