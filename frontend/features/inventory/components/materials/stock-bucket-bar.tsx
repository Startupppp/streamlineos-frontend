"use client";

import { Fragment } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * B2 — the seven buckets, shown separately and never added up for the reader.
 *
 * "Available" is the only number anybody may promise against, and it is a
 * subtraction: on hand, less what is reserved, damaged, quarantined, picked and
 * in a van. Printing the terms beside the answer is what stops an operator doing
 * that subtraction in their head — which is the reliable way to sell stock twice.
 */
export interface StockBuckets {
  onHand: number;
  available: number;
  reserved: number;
  damaged: number;
  quarantined: number;
  picked: number;
  inTransit: number;
}

interface Bucket {
  key: keyof StockBuckets;
  label: string;
  hint: string;
  emphasis?: boolean;
}

const BUCKETS: Bucket[] = [
  { key: "onHand", label: "On hand", hint: "Everything physically ours, wherever it is standing." },
  { key: "available", label: "Available", hint: "What may be promised right now. On hand less every bucket to the right.", emphasis: true },
  { key: "reserved", label: "Reserved", hint: "Held for an order or a construction site. Still on the shelf, not yours to sell." },
  { key: "picked", label: "Picked", hint: "Off the shelf and on the packing bench, not yet dispatched." },
  { key: "inTransit", label: "In transit", hint: "In a van between two dark stores. On hand org-wide, pickable nowhere." },
  { key: "damaged", label: "Damaged", hint: "Blocked in a bin pending a write-off or a return to the supplier." },
  { key: "quarantined", label: "Quarantined", hint: "Held pending a quality decision. Nothing can be promised from it." },
];

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export function StockBucketBar({ buckets, dense = false }: { buckets: StockBuckets; dense?: boolean }) {
  return (
    <TooltipProvider delayDuration={200}>
      {/*
        `dense` is the in-card variant. Seven columns inside a half-width card is
        about 70px each, which wraps "In transit" onto two lines and makes the
        row read as ragged noise; four columns and two rows is the same
        information, legibly.
      */}
      <dl
        className={
          dense
            ? "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4"
            : "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-y-4 xl:grid-cols-7"
        }
      >
        {BUCKETS.map((b) => (
          <Fragment key={b.key}>
            <div className="min-w-0">
              <dt className="flex items-center gap-1 text-dense font-medium text-muted-foreground">
                {b.label}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`What ${b.label.toLowerCase()} means`}
                    >
                      <Info className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56">{b.hint}</TooltipContent>
                </Tooltip>
              </dt>
              <dd
                className={`tabular-nums ${
                  b.emphasis
                    ? "text-xl font-semibold text-foreground"
                    : "text-base font-medium text-foreground"
                }`}
              >
                {nf.format(buckets[b.key])}
              </dd>
            </div>
          </Fragment>
        ))}
      </dl>
    </TooltipProvider>
  );
}
