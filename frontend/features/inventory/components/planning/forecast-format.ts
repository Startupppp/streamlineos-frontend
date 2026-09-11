import { formatDecimal } from "@/lib/format-utils";

const QUANTITY_LOCALE = "en-IN";
const QUANTITY_FRACTION_DIGITS = 4;

/**
 * Quantities arrive from the forecast engine as exact `numeric(18,4)` decimal
 * strings, because a ledger quantity that has been through a float is no longer
 * the quantity. `Intl.NumberFormat` formats a numeric string exactly, so the
 * string form is passed straight through rather than being parsed first.
 */
export function formatQuantity(value: number | string): string {
  // `Intl.NumberFormat.format` accepts a numeric string and formats it exactly
  // (ES2023). TypeScript types that parameter as a numeric *literal*, which no
  // runtime string can satisfy, so the assertion narrows to what the runtime
  // actually takes rather than pretending the string is a number.
  return formatDecimal(value as `${number}`, QUANTITY_FRACTION_DIGITS, QUANTITY_LOCALE);
}

export function formatSignedQuantity(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${formatDecimal(Math.abs(value), QUANTITY_FRACTION_DIGITS, QUANTITY_LOCALE)}`;
}

export function formatServiceLevel(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatWeeks(value: number): string {
  return `${value.toFixed(2)} wk`;
}
