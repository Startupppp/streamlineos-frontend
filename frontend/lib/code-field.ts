import type { ChangeEvent } from "react";

export function codeFieldValue(raw: string, maxLength?: number): string {
  const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (maxLength === undefined) return normalized;
  return normalized.slice(0, maxLength);
}

export function codeFieldChange(
  onChange: (value: string) => void,
  maxLength?: number,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleCodeFieldChange(event) {
    onChange(codeFieldValue(event.target.value, maxLength));
  };
}

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
