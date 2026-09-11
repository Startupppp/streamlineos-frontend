import type { ChangeEvent } from "react";

/**
 * A bank or tax code — IFSC, PAN, SWIFT, a product SKU — is uppercase
 * alphanumeric and bounded. The rule was retyped at every such field in three
 * spellings that disagree on the one case that matters, a paste:
 *
 * - `value.toUpperCase()` alone keeps whatever the clipboard held, spaces and
 *   hyphens included, and hands an invalid code to the resolver.
 * - `if (/^[A-Z0-9]*$/.test(v) && v.length <= 11) onChange(v)` REJECTS the
 *   whole edit when the test fails. The field is controlled, so React puts the
 *   old value straight back: pasting `SBIN0001234 ` from a bank statement makes
 *   the box appear frozen, with nothing said about why.
 * - `toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, n)` normalises instead,
 *   which is the only one of the three that shows the user what was accepted.
 *
 * Normalising is the rule this owns. A code that is too long is truncated
 * rather than dropped, and a code with punctuation in it loses the punctuation
 * rather than the keystroke.
 */
export function codeFieldValue(raw: string, maxLength?: number): string {
  const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (maxLength === undefined) return normalized;
  return normalized.slice(0, maxLength);
}

/**
 * The react-hook-form binding, so the JSX prop holds a call rather than a
 * closure that restates the rule.
 */
export function codeFieldChange(
  onChange: (value: string) => void,
  maxLength?: number,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleCodeFieldChange(event) {
    onChange(codeFieldValue(event.target.value, maxLength));
  };
}

/**
 * The same shape for a field that is bounded but not restricted to
 * alphanumerics — a PF/UAN number is digits only, an ESI number is free text
 * with a length cap. Both were also written as "reject the edit" tests.
 */
export function digitsFieldValue(raw: string, maxLength?: number): string {
  const digits = raw.replace(/\D/g, "");
  if (maxLength === undefined) return digits;
  return digits.slice(0, maxLength);
}

export function digitsFieldChange(
  onChange: (value: string) => void,
  maxLength?: number,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleDigitsFieldChange(event) {
    onChange(digitsFieldValue(event.target.value, maxLength));
  };
}
