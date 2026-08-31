"use client";

import { cn } from "@/lib/utils";
import { formatCurrencyFull, formatINRCompact, formatMoneyCompact } from "@/lib/format-utils";

type MoneyProps = {
  value: number;
  currency?: string;
  compact?: boolean;
  className?: string;
};

function formatCompact(value: number, currency: string): string {
  if (currency === "INR") return formatINRCompact(value);
  return formatMoneyCompact(value, { currency, locale: "en" });
}

export function Money({
  value,
  currency = "INR",
  compact = false,
  className,
}: MoneyProps) {
  const isNegative = value < 0;

  const formatted = compact
    ? formatCompact(value, currency)
    : formatCurrencyFull(value, currency);

  return (
    <span
      className={cn(
        "tabular-nums font-mono",
        isNegative && "text-status-danger-ink",
        className,
      )}
    >
      {formatted}
    </span>
  );
}
