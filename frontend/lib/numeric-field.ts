import type { ChangeEvent } from "react";

export function numericFieldValue(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function numericFieldChange(
  onChange: (value: number | undefined) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleNumericFieldChange(event) {
    onChange(numericFieldValue(event.target.value));
  };
}

export function numericFieldValueOr(raw: string, fallback: number): number {
  return numericFieldValue(raw) ?? fallback;
}

export function numericFieldChangeOr(
  onChange: (value: number) => void,
  fallback: number,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleNumericFieldChangeOr(event) {
    onChange(numericFieldValueOr(event.target.value, fallback));
  };
}

export function numericSelectChange(
  onChange: (value: number) => void,
): (value: string) => void {
  return function handleNumericSelectChange(value) {
    onChange(Number(value));
  };
}

export function optionalNumericSelectChange(
  onChange: (value: number | undefined) => void,
): (value: string) => void {
  return function handleOptionalNumericSelectChange(value) {
    onChange(numericFieldValue(value));
  };
}
