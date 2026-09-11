import type { ChangeEvent } from "react";

const LATIN_NAME_PATTERN = /^[A-Za-z\s]*$/;
const DIGITS_ONLY_PATTERN = /^\d*$/;

/**
 * These two REJECT the whole edit when the value does not match, and the inputs
 * are controlled, so React puts the old value straight back: a pasted "O'Brien"
 * or a name carrying a diacritic silently does nothing, and the box reads as
 * frozen. That is a recorded open decision — which characters a name may hold
 * is the HR product owner's call, tracked as R-10c in
 * `.scratch/code-release-10-10/reports/residual-risk-register.md` §3.9 — so the
 * rule is preserved here EXACTLY as it was written inline and only given a
 * name. Do not widen the pattern without that decision, and do not move this
 * into `lib/`: a shared home would bless a Latin-only name rule for the repo.
 */
export function latinNameFieldChange(
  onChange: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleLatinNameFieldChange(event) {
    if (LATIN_NAME_PATTERN.test(event.target.value)) onChange(event.target.value);
  };
}

export function digitsOnlyFieldChange(
  onChange: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleDigitsOnlyFieldChange(event) {
    if (DIGITS_ONLY_PATTERN.test(event.target.value)) onChange(event.target.value);
  };
}
