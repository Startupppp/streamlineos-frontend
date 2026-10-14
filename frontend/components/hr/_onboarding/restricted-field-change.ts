import type { ChangeEvent } from "react";

// Letters and combining marks in any script, plus the punctuation real names
// carry: space, hyphen, apostrophe (straight and curly) and period. The backend
// (`personNameField`) accepts any text; this only stops digits and symbols.
// R-10c decided 2026-10-13: the old Latin-only rule silently reverted
// "姓名测试-Αβγ", "O'Brien" and every diacritic (QA 2026-10-13, P1).
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}\s'\u2019.-]*$/u;
const DIGITS_ONLY_PATTERN = /^\d*$/;

/**
 * Rejects the whole edit when the value does not match: the input is
 * controlled, so React keeps the previous value.
 */
export function personNameFieldChange(
  onChange: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handlePersonNameFieldChange(event) {
    if (PERSON_NAME_PATTERN.test(event.target.value)) onChange(event.target.value);
  };
}

export function digitsOnlyFieldChange(
  onChange: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleDigitsOnlyFieldChange(event) {
    if (DIGITS_ONLY_PATTERN.test(event.target.value)) onChange(event.target.value);
  };
}
