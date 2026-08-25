"use client";

import { cn } from "@/lib/utils";
import { formatCurrencyFull, formatINRCompact } from "@/lib/format-utils";

type MoneyProps = {
  value: number;
  currency?: string;
  compact?: boolean;
  className?: string;
};

function formatCompact(value: number, currency: string): string {
  if (currency === "INR") return formatINRCompact(value);
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const symbol = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
    .format(0)
    .replace(/[\d,.]/g, "")
    .trim();
  if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  return formatCurrencyFull(value, currency);
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
