"use client";

import { useState } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";
import { PRICING_TIERS } from "@/lib/pricing";

type MatrixRow = { feature: string; tiers: (boolean | string)[] };

type PricingFeatureMatrixProps = {
  rows: MatrixRow[];
};

export function PricingFeatureMatrix({ rows }: PricingFeatureMatrixProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="sticky left-0 z-10 min-w-[220px] bg-muted px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                Feature
              </th>
              {PRICING_TIERS.map((tier) => (
                <th
                  key={tier.id}
                  className="min-w-[120px] px-3 py-3.5 text-center text-sm font-semibold text-foreground"
                >
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.feature}
                className={`border-b border-border last:border-0 ${
                  i % 2 === 0 ? "bg-white" : "bg-muted"
                }`}
              >
                <td className="sticky left-0 z-10 bg-inherit px-4 py-3 text-sm text-foreground">
                  {row.feature}
                </td>
                {row.tiers.map((value, j) => (
                  <td key={j} className="px-3 py-3 text-center text-sm text-muted-foreground">
                    {typeof value === "boolean" ? (
                      value ? (
                        <Check
                          className="mx-auto h-4 w-4 text-status-success-ink"
                          strokeWidth={2.5}
                          aria-label="Included"
                        />
                      ) : (
                        <Minus
                          className="mx-auto h-4 w-4 text-muted-foreground"
                          aria-label="Not included"
                        />
                      )
                    ) : (
                      <span className="text-xs font-medium text-foreground">{value}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type FaqItem = { question: string; answer: string };

export function PricingFaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-white shadow-sm">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.question}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info-rule focus-visible:ring-inset"
            >
              <span className="text-sm font-medium text-foreground">{f.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>
            {isOpen ? (
              <div className="px-5 pb-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
