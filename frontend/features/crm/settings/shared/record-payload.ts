import type { RecordFormValues } from "@/components/renderer";

export function textOrNull(values: RecordFormValues, name: string): string | null | undefined {
  const raw = values[name];
  if (raw === undefined) return undefined;
  const text = raw.trim();
  return text === "" ? null : text;
}

export function textOrOmit(values: RecordFormValues, name: string): string | undefined {
  const raw = values[name];
  if (raw === undefined) return undefined;
  const text = raw.trim();
  return text === "" ? undefined : text;
}

export function requiredText(values: RecordFormValues, name: string): string {
  return values[name]?.trim() ?? "";
}

export function numberOrOmit(values: RecordFormValues, name: string): number | undefined {
  const raw = values[name];
  if (raw === undefined) return undefined;
  const text = raw.trim();
  if (text === "") return undefined;
  const amount = Number(text);
  return Number.isFinite(amount) ? amount : undefined;
}

export function numberOrNull(values: RecordFormValues, name: string): number | null | undefined {
  const raw = values[name];
  if (raw === undefined) return undefined;
  const text = raw.trim();
  if (text === "") return null;
  const amount = Number(text);
  return Number.isFinite(amount) ? amount : null;
}

export function numberOr(values: RecordFormValues, name: string, fallback: number): number {
  return numberOrOmit(values, name) ?? fallback;
}

export function flagOrOmit(values: RecordFormValues, name: string): boolean | undefined {
  const raw = values[name];
  return raw === undefined ? undefined : raw === "true";
}

export function flagOr(values: RecordFormValues, name: string, fallback: boolean): boolean {
  return flagOrOmit(values, name) ?? fallback;
}

export function listValue(values: RecordFormValues, name: string): string[] | undefined {
  const raw = values[name];
  if (raw === undefined) return undefined;
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
