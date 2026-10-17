"use client";

import { Fragment, useState } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";
import { PRICING_TIERS } from "@/lib/pricing";

type MatrixRow = { feature: string; tiers: (boolean | string)[] };

export type PricingComparisonGroup = {
  title: string;
  rows: MatrixRow[];
};

type PricingFeatureMatrixProps = {
  groups: PricingComparisonGroup[];
};

function MatrixCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check
        className="mx-auto h-4 w-4 text-status-success-ink"
        strokeWidth={2.5}
        aria-label="Included"
      />
    ) : (
      <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not included" />
    );
  }
  return <span className="text-xs font-medium text-foreground">{value}</span>;
}

export function PricingFeatureMatrix({ groups }: PricingFeatureMatrixProps) {
  const columnCount = PRICING_TIERS.length + 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="sticky left-0 z-10 min-w-[200px] bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Included
              </th>
              {PRICING_TIERS.map((tier) => (
                <th
                  key={tier.id}
                  className="min-w-[110px] px-3 py-3 text-center text-sm font-semibold text-foreground"
                >
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.title}>
                <tr className="border-b border-border bg-muted/60">
                  <th
                    colSpan={columnCount}
                    className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.title}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={`${group.title}-${row.feature}`} className="border-b border-border last:border-0">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-sm text-foreground">
                      {row.feature}
                    </td>
                    {row.tiers.map((value, index) => (
                      <td key={index} className="px-3 py-2.5 text-center text-sm text-muted-foreground">
                        <MatrixCell value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
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
