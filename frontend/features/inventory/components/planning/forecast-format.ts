import { formatDecimal } from "@/lib/format-utils";

const QUANTITY_LOCALE = "en-IN";
const QUANTITY_FRACTION_DIGITS = 4;

const NUMERIC_STRING = /^-?\d+(\.\d+)?$/;

function isNumericString(value: string): value is `${number}` {
  return NUMERIC_STRING.test(value);
}

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
