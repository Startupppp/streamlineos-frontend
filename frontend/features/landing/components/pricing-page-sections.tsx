"use client";

import { Fragment, useState } from "react";
import { Check, Minus } from "lucide-react";
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
        className="mx-auto size-4 text-accent-soft"
        strokeWidth={2.5}
        aria-label="Included"
      />
    ) : (
      <Minus className="mx-auto size-4 text-foreground-dim" aria-label="Not included" />
    );
  }
  return <span className="text-relay-label leading-label font-medium text-foreground">{value}</span>;
}

/**
 * Glass comparison table (Relay pricing card language). It scrolls sideways
 * below its 720 minimum; the feature column stays pinned on the page black so
 * the scrolled cells never show through it.
 */
export function PricingFeatureMatrix({ groups }: PricingFeatureMatrixProps) {
  const columnCount = PRICING_TIERS.length + 1;

  return (
    <div className="overflow-hidden rounded-pricing-card border border-pricing-card-border bg-pricing-card backdrop-blur-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 text-left">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="sticky left-0 z-10 min-w-50 bg-background px-6 py-4 font-mono text-relay-label leading-label font-normal text-foreground-muted w390:px-4">
                Included
              </th>
              {PRICING_TIERS.map((tier) => (
                <th
                  key={tier.id}
                  className="min-w-28 px-3 py-4 text-center text-body leading-body font-semibold text-foreground"
                >
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.title}>
                <tr className="border-b border-border-subtle bg-surface-glass">
                  <th
                    colSpan={columnCount}
                    className="px-6 py-2.5 text-left font-mono text-relay-label leading-label font-normal text-accent-soft w390:px-4"
                  >
                    {group.title}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={`${group.title}-${row.feature}`} className="border-b border-border-subtle last:border-0">
                    <td className="sticky left-0 z-10 bg-background px-6 py-3.5 text-body leading-body text-foreground-muted w390:px-4">
                      {row.feature}
                    </td>
                    {row.tiers.map((value, index) => (
                      <td key={index} className="px-3 py-3.5 text-center">
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

/** The homepage FAQ's glass rows and accent plus (relay/home/sections/faq). */
export function PricingFaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="flex flex-col gap-3">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <li
            key={f.question}
            className={`rounded-2xl border bg-card-glass backdrop-blur-card transition-colors duration-(--motion-fast) ease-entrance ${
              isOpen ? "border-border-glass" : "border-border-subtle"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-6 rounded-2xl px-6 py-5 text-left text-lead leading-lead font-medium text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent w390:px-4 w390:py-4 w390:text-body w390:leading-body"
            >
              {f.question}
              <span
                aria-hidden="true"
                className={`relative size-4 shrink-0 text-accent transition-transform duration-(--motion-fast) ease-entrance ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
              </span>
            </button>
            {isOpen ? (
              <p className="max-w-190 px-6 pb-6 text-body leading-body text-foreground-muted w390:px-4 w390:pb-4">
                {f.answer}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
