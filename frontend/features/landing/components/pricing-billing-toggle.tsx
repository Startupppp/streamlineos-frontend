"use client";

import { PRICING, type BillingPeriod } from "@/lib/pricing";

type PricingBillingToggleProps = {
  period: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
  className?: string;
};

export function PricingBillingToggle({
  period,
  onChange,
  className,
}: PricingBillingToggleProps) {
  return (
    <div className={`flex flex-col items-center gap-3 sm:flex-row sm:justify-center ${className ?? ""}`}>
      <div
        role="group"
        aria-label="Billing period"
        className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-1"
      >
        <button
          type="button"
          onClick={() => onChange("annual")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            period === "annual"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Annual
        </button>
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            period === "monthly"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Monthly
        </button>
      </div>
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/80">
        Save {PRICING.annualDiscountPct}% on annual
      </span>
    </div>
  );
}
