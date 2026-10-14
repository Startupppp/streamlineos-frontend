"use client";

import type { MouseEvent } from "react";
import { PRICING, type BillingPeriod } from "@/lib/pricing";

const PERIODS = [
  { value: "annual", label: "Annual" },
  { value: "monthly", label: "Monthly" },
] as const satisfies readonly { value: BillingPeriod; label: string }[];

export function PricingBillingToggle({
  period,
  onChange,
}: {
  period: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const next = PERIODS.find((item) => item.value === event.currentTarget.dataset.period);
    if (next) onChange(next.value);
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center mb-8">
      <div
        role="group"
        aria-label="Billing period"
        className="inline-flex rounded-full border border-border bg-card p-1"
      >
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            data-period={value}
            onClick={handleClick}
            aria-pressed={period === value}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              period === value ? "bg-foreground text-white shadow-sm" : "text-foreground hover:text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="inline-flex items-center rounded-full bg-status-success-surface px-2.5 py-1 text-xs font-semibold text-status-success-ink ring-1 ring-status-success-rule">
        Save {PRICING.annualDiscountPct}% on annual
      </span>
    </div>
  );
}
