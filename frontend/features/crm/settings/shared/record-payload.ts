import type { RecordFormValues } from "@/features/renderer";

/**
 * Reading a generated form's values back out as an API payload.
 *
 * Every control the engine renders hands back a string, and every settings
 * endpoint here wants something else — a number of hours, a boolean flag, an
 * absent key. Written once because eleven settings sheets would otherwise each
 * carry the same three conversions, and the interesting half of them is the same
 * rule in all eleven:
 *
 * **A key the form did not render is absent, not empty.** A tenant who hides a
 * field has asked to stop looking at it; the engine honours that by leaving the
 * field out of the form, so `values` has no entry for it at all. A payload built
 * by naming keys reads `undefined`, sends `null`, and clears a column nobody
 * touched — hiding quietly becomes deleting. Every function below returns
 * `undefined` for a key that is not there, and `undefined` is what a PATCH means
 * by "leave this alone".
 */

/** Trimmed text, `null` when the field was rendered and left blank. */
export function textOrNull(values: RecordFormValues, name: string): string | null | undefined {
  const raw = values[name];
  if (raw === undefined) return undefined;
  const text = raw.trim();
  return text === "" ? null : text;
}

/** Trimmed text, absent when blank — a create has nothing to clear. */
export function textOrOmit(values: RecordFormValues, name: string): string | undefined {
  const raw = values[name];
  if (raw === undefined) return undefined;
  const text = raw.trim();
  return text === "" ? undefined : text;
}

/** Required text, for a field the layout marks `required` and the API demands. */
export function requiredText(values: RecordFormValues, name: string): string {
  return values[name]?.trim() ?? "";
}

/**
 * A number, absent when the field is missing, blank or unreadable.
 *
 * Unreadable rather than `0`, because a malformed price sent as zero is a
 * confident wrong answer where an omission is at least visibly incomplete.
 */
export function numberOrOmit(values: RecordFormValues, name: string): number | undefined {
  const raw = values[name];
  if (raw === undefined) return undefined;
  const text = raw.trim();
  if (text === "") return undefined;
  const amount = Number(text);
  return Number.isFinite(amount) ? amount : undefined;
}

/** A number with a fallback, for a field the API requires. */
export function numberOr(values: RecordFormValues, name: string, fallback: number): number {
  return numberOrOmit(values, name) ?? fallback;
}

/**
 * A flag, from a `boolean` field.
 *
 * The engine renders one as a switch but carries its value as `"true"` or
 * `"false"`, so that every control in a generated form hands back a string and
 * one resolver can match them all. Converting back to a boolean is the
 * boundary's job, which is here.
 */
export function flagOrOmit(values: RecordFormValues, name: string): boolean | undefined {
  const raw = values[name];
  return raw === undefined ? undefined : raw === "true";
}

/** A flag with a fallback, for a field the API requires. */
export function flagOr(values: RecordFormValues, name: string, fallback: boolean): boolean {
  return flagOrOmit(values, name) ?? fallback;
}

/**
 * A comma-separated control's value as a list.
 *
 * Chip editors are supplied by the surface through `RecordForm`'s `controls`,
 * so the value the engine carries is still one string; splitting it here keeps
 * that decision in one place rather than in each sheet that has a chip field.
 */
export function listValue(values: RecordFormValues, name: string): string[] | undefined {
  const raw = values[name];
  if (raw === undefined) return undefined;
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
