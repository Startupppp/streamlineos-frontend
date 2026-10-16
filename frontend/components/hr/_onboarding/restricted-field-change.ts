import type { ChangeEvent } from "react";

const PERSON_NAME_PATTERN = /^[\p{L}\p{M}\s'\u2019.-]*$/u;
const DIGITS_ONLY_PATTERN = /^\d*$/;

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
