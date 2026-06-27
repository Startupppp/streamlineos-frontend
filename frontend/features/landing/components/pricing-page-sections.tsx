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
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="sticky left-0 z-10 min-w-[220px] bg-slate-50/95 px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
                Feature
              </th>
              {PRICING_TIERS.map((tier) => (
                <th
                  key={tier.id}
                  className="min-w-[120px] px-3 py-3.5 text-center text-sm font-semibold text-slate-900"
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
                className={`border-b border-slate-100 last:border-0 ${
                  i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <td className="sticky left-0 z-10 bg-inherit px-4 py-3 text-sm text-slate-700">
                  {row.feature}
                </td>
                {row.tiers.map((value, j) => (
                  <td key={j} className="px-3 py-3 text-center text-sm text-slate-600">
                    {typeof value === "boolean" ? (
                      value ? (
                        <Check
                          className="mx-auto h-4 w-4 text-emerald-600"
                          strokeWidth={2.5}
                          aria-label="Included"
                        />
                      ) : (
                        <Minus
                          className="mx-auto h-4 w-4 text-slate-300"
                          aria-label="Not included"
                        />
                      )
                    ) : (
                      <span className="text-xs font-medium text-slate-700">{value}</span>
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
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.question}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
            >
              <span className="text-sm font-medium text-slate-900">{f.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>
            {isOpen ? (
              <div className="px-5 pb-4">
                <p className="text-sm leading-relaxed text-slate-600">{f.answer}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
