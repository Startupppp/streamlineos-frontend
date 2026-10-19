"use client";

import { PRICING, type BillingPeriod } from "@/lib/pricing";

type PricingBillingToggleProps = {
  period: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
  className?: string;
};

const OPTIONS: { value: BillingPeriod; label: string }[] = [
  { value: "annual", label: "Annual" },
  { value: "monthly", label: "Monthly" },
];

/** Relay glass pill: the active period wears the brand gradient, as the CTAs do. */
export function PricingBillingToggle({
  period,
  onChange,
  className,
}: PricingBillingToggleProps) {
  return (
    <div className={`flex items-center justify-center gap-4 w390:flex-col w390:gap-3 ${className ?? ""}`}>
      <div
        role="group"
        aria-label="Billing period"
        className="inline-flex rounded-full border border-border-subtle bg-surface-glass p-1 backdrop-blur-card"
      >
        {OPTIONS.map((option) => {
          const active = period === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`rounded-full px-5 py-2 text-body leading-body font-medium transition-colors duration-(--motion-fast) ease-entrance focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? "bg-linear-135 from-brand-from to-brand-to text-on-accent"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span className="inline-flex items-center rounded-full border border-border-subtle bg-surface-badge px-3 py-1.5 font-mono text-relay-label leading-label whitespace-nowrap text-accent-soft">
        Save {PRICING.annualDiscountPct}% on annual
      </span>
    </div>
  );
}
