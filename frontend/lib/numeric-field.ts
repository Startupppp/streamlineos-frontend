import type { ChangeEvent } from "react";

/**
 * A text input always hands back a string, so every numeric form field has to
 * decide what an empty or half-typed box means. That decision was being retyped
 * at 44 call sites in at least eight spellings — `Number(v)`, `parseInt(v, 10)`,
 * `parseInt(v)`, `parseFloat(v) || 0`, `v ? Number(v) : 0`, `v === "" ?
 * undefined : Number(v)` — and they disagree: an emptied box becomes `0` under
 * some, `NaN` under others, `undefined` under the rest.
 *
 * `NaN` is the harmful one. It reaches a `z.number()` field as
 * "Expected number, received nan" rather than "Required", and `.min()` never
 * runs. `undefined` is the honest answer for a box with nothing in it, and lets
 * the schema say what it wants said.
 */
export function numericFieldValue(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * The react-hook-form binding. The JSX prop holds a call, not a closure, so the
 * rule is named at every field instead of copied into it.
 */
export function numericFieldChange(
  onChange: (value: number | undefined) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleNumericFieldChange(event) {
    onChange(numericFieldValue(event.target.value));
  };
}

/**
 * The same rule for a field that must stay a number rather than go absent —
 * a score, a scale bound, a page size. It was written as
 * `Number(v) || 0`, `parseFloat(v) || 0`, `parseInt(v, 10) || 0` and
 * `v === "" ? 0 : Number(v)`, which agree on an emptied box and disagree on
 * everything else: the `parseInt` spellings silently truncate `1.5` to `1`
 * instead of letting a `z.number().int()` field say so, and the bare
 * `Number(v)` spelling lets `NaN` through.
 */
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

/**
 * A `<Select>` hands back a string it was given, so the empty case cannot
 * arise — but the value still has to be widened back to the number the state
 * holds. `Number(v)` inline in `onValueChange` is the same rule in a second
 * spelling; this keeps the JSX prop holding a call.
 */
export function numericSelectChange(
  onChange: (value: number) => void,
): (value: string) => void {
  return function handleNumericSelectChange(value) {
    onChange(Number(value));
  };
}
