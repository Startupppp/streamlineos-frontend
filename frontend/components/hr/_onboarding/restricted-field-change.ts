import type { ChangeEvent } from "react";

const DIGITS_ONLY_PATTERN = /^\d*$/;

export function digitsOnlyFieldChange(
  onChange: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleDigitsOnlyFieldChange(event) {
    if (DIGITS_ONLY_PATTERN.test(event.target.value)) onChange(event.target.value);
  };
}
