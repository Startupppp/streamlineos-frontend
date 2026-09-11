import { formatDecimal } from "@/lib/format-utils";

const QUANTITY_LOCALE = "en-IN";
const QUANTITY_FRACTION_DIGITS = 4;

const NUMERIC_STRING = /^-?\d+(\.\d+)?$/;

/**
 * Whether a string is the exact decimal form `Intl.NumberFormat.format` takes
 * (ES2023). TypeScript types that parameter as a numeric *literal*, so this is
 * the runtime check that earns the narrowing rather than an assertion claiming
 * it without one.
 */
function isNumericString(value: string): value is `${number}` {
  return NUMERIC_STRING.test(value);
}

/**
 * Quantities arrive from the forecast engine as exact `numeric(18,4)` decimal
 * strings, because a ledger quantity that has been through a float is no longer
 * the quantity. `Intl.NumberFormat` formats a numeric string exactly, so the
 * string form is passed straight through rather than being parsed first —
 * anything that is not a number in string form is returned as it arrived, since
 * formatting it would render `NaN` over the top of whatever the engine said.
 */
export function formatQuantity(value: number | string): string {
  if (typeof value === "number")
    return formatDecimal(value, QUANTITY_FRACTION_DIGITS, QUANTITY_LOCALE);
  if (!isNumericString(value)) return value;
  return formatDecimal(value, QUANTITY_FRACTION_DIGITS, QUANTITY_LOCALE);
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
