const QUANTITY_FORMAT = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 });

export function formatQuantity(value: number): string {
  return QUANTITY_FORMAT.format(value);
}

export function formatSignedQuantity(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${QUANTITY_FORMAT.format(Math.abs(value))}`;
}

export function formatServiceLevel(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatWeeks(value: number): string {
  return `${value.toFixed(2)} wk`;
}
