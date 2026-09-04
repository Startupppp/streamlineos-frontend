import { formatCurrencyFull } from "@/lib/format-utils";

export function formatAccountingAmount(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return formatCurrencyFull(n);
}
