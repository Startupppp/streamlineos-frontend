import type { ChangeEvent } from "react";

export function upperCaseFieldChange(
  onChange: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleUpperCaseFieldChange(event) {
    onChange(event.target.value.toUpperCase());
  };
}

export function lowerCaseFieldChange(
  onChange: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleLowerCaseFieldChange(event) {
    onChange(event.target.value.toLowerCase());
  };
}
