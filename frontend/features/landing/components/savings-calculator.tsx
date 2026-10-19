"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import {
  calculateSavingsVsAllInOne,
  calculateSavingsVsStack,
  COMPETITOR_PRICES,
  PRICING_TIERS,
} from "@/lib/pricing";

const INR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const MIN_SEATS = 3;
const MAX_SEATS = 200;
const SEAT_TICKS = [3, 50, 100, 200] as const;

function seatTickPosition(value: number) {
  return ((value - MIN_SEATS) / (MAX_SEATS - MIN_SEATS)) * 100;
}

export function SavingsCalculator() {
  const [seats, setSeats] = useState(20);

  const vsAllInOne = useMemo(
    () => calculateSavingsVsAllInOne(seats, "annual"),
    [seats],
  );
  const vsStack = useMemo(() => calculateSavingsVsStack(seats), [seats]);

  const starterAnnual =
    PRICING_TIERS.find((t) => t.id === "starter")?.annual ??
    PRICING_TIERS[1].annual ??
    0;

  return (
    <div className="min-w-0 rounded-pricing-card border border-pricing-card-border bg-pricing-card p-8 backdrop-blur-card w1024:p-6 w390:p-4.75">
      <div className="mb-8 w390:mb-6">
        <label
          htmlFor="seats-slider"
          className="mb-4 flex items-center justify-between gap-3"
        >
          <span className="inline-flex min-w-0 items-center gap-2 font-mono text-relay-label leading-label text-foreground-muted">
            <Users className="size-4 shrink-0 text-accent-soft" aria-hidden />
            Team size
          </span>
          <span className="shrink-0 text-pricing-price leading-pricing-price font-semibold tracking-title tabular-nums text-foreground">
            {seats}
            <span className="ml-2 font-mono text-relay-label leading-label font-normal tracking-normal text-foreground-dim">users</span>
          </span>
        </label>
        <input
          id="seats-slider"
          type="range"
          min={MIN_SEATS}
          max={MAX_SEATS}
          step={1}
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-pricing-track accent-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent-soft [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-soft [&::-webkit-slider-thumb]:shadow-pricing-button-glow"
          aria-label="Number of users"
          aria-valuemin={MIN_SEATS}
          aria-valuemax={MAX_SEATS}
          aria-valuenow={seats}
        />
        <div className="relative mt-2 h-5">
          {SEAT_TICKS.map((tick) => {
            const pct = seatTickPosition(tick);
            const isMin = tick === MIN_SEATS;
            const isMax = tick === MAX_SEATS;
            return (
              <span
                key={tick}
                className="absolute font-mono text-relay-label leading-label text-foreground-dim"
                style={{
                  left: isMin ? "0%" : isMax ? "100%" : `${pct}%`,
                  transform: isMin
                    ? "none"
                    : isMax
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
                }}
              >
                {tick}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w390:grid-cols-1">
        <ComparisonCard
          label="Typical all-in-one platform"
          subtitle={`${INR(COMPETITOR_PRICES.allInOneErp)} × ${seats} × 12 mo`}
          amount={INR(vsAllInOne.competitorAnnual)}
        />
        <ComparisonCard
          label="StreamlineOS Starter"
          subtitle={`${INR(starterAnnual)} / mo × 12 (org plan)`}
          amount={INR(vsAllInOne.streamlineAnnual)}
          highlight
        />
      </div>

      <div className="mt-3 rounded-2xl bg-linear-135 from-brand-from to-brand-to px-6 py-5 text-on-accent w390:px-4.75">
        <p className="font-mono text-relay-label leading-label">Annual savings</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <p className="text-pricing-price leading-pricing-price font-semibold tracking-title tabular-nums">
            {INR(vsAllInOne.savings)}
            <span className="ml-2 font-mono text-relay-label leading-label font-normal tracking-normal">/ year</span>
          </p>
          <span className="rounded-full bg-brand-navy px-3 py-1 text-relay-label leading-label font-semibold text-accent-soft">
            {vsAllInOne.savingsPct}% less
          </span>
        </div>
      </div>

      <details className="group mt-6">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-3 rounded-sm text-body leading-body font-medium text-foreground marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="relative size-3.5 shrink-0 text-accent transition-transform duration-(--motion-fast) ease-entrance group-open:rotate-45"
          >
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
          </span>
          Compare against a per-tool stack
        </summary>
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-glass p-5 w390:p-4">
          <p className="text-body leading-body text-foreground-muted">
            HR + CRM + Chat + Docs separately (Keka + HubSpot + a chat tool + Notion) costs ~
            {INR(vsStack.stackPerSeat)} per seat.
          </p>
          <div className="grid grid-cols-2 gap-3 w390:grid-cols-1">
            <ComparisonCard
              label="Per-tool stack"
              subtitle={`${INR(vsStack.stackPerSeat)} × ${seats} × 12 mo`}
              amount={INR(vsStack.stackAnnual)}
              compact
            />
            <ComparisonCard
              label="StreamlineOS Startup"
              subtitle="One platform"
              amount={INR(vsStack.streamlineAnnual)}
              highlight
              compact
            />
          </div>
          <p className="text-body leading-body font-medium text-accent-soft">
            Save {INR(vsStack.savings)} / year ({vsStack.savingsPct}% off the stack)
          </p>
        </div>
      </details>
    </div>
  );
}

function ComparisonCard({
  label,
  subtitle,
  amount,
  highlight = false,
  compact = false,
}: {
  label: string;
  subtitle: string;
  amount: string;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border ${
        highlight ? "border-border-glass bg-surface-glass" : "border-border-subtle bg-background"
      } ${compact ? "p-4" : "p-5 w390:p-4"}`}
    >
      <p
        className={`font-mono text-relay-label leading-label ${highlight ? "text-accent-soft" : "text-foreground-muted"}`}
      >
        {label}
      </p>
      <p
        className={`mt-1.5 font-semibold tracking-title tabular-nums text-foreground ${
          compact ? "text-lead leading-lead" : "text-section-title leading-section-title"
        }`}
      >
        {amount}
        <span className="ml-1.5 font-mono text-relay-label leading-label font-normal tracking-normal text-foreground-dim">/ year</span>
      </p>
      <p className="mt-1 text-relay-label leading-label text-foreground-dim">{subtitle}</p>
    </div>
  );
}
