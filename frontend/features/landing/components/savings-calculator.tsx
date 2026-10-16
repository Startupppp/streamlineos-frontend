"use client";

import { useState, type ChangeEvent } from "react";
import { ChevronDown, Users } from "lucide-react";
import {
  calculateSavingsVsAllInOne,
  calculateSavingsVsStack,
  COMPETITOR_PRICES,
  PRICING_TIERS,
} from "@/lib/pricing";

const INR = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const MIN_SEATS = 3;
const MAX_SEATS = 200;
const SEAT_TICKS = [3, 50, 100, 200] as const;

export function SavingsCalculator() {
  const [seats, setSeats] = useState(20);

  function handleSeatsChange(event: ChangeEvent<HTMLInputElement>) {
    setSeats(Number(event.target.value));
  }

  const vsAllInOne = calculateSavingsVsAllInOne(seats, "annual");
  const vsStack = calculateSavingsVsStack(seats);

  const starterAnnual =
    PRICING_TIERS.find((t) => t.id === "starter")?.annual ??
    PRICING_TIERS[1].annual ??
    0;

  return (
    <div className="min-w-0 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8 md:p-10">
      <div className="mb-6 sm:mb-8">
        <label
          htmlFor="seats-slider"
          className="mb-3 flex items-center justify-between gap-3 text-sm"
        >
          <span className="inline-flex items-center gap-2 font-medium text-foreground min-w-0">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            Team size
          </span>
          <span className="shrink-0 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            {seats}
            <span className="ml-1.5 text-sm font-medium text-muted-foreground">users</span>
          </span>
        </label>
        <input
          id="seats-slider"
          type="range"
          min={MIN_SEATS}
          max={MAX_SEATS}
          step={1}
          value={seats}
          onChange={handleSeatsChange}
          className="h-6 w-full cursor-pointer appearance-none bg-transparent accent-(--lp-accent) [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:-mt-1.75 [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-status-info-fill [&::-webkit-slider-thumb]:shadow-sm"
          aria-label="Number of users"
          aria-valuemin={MIN_SEATS}
          aria-valuemax={MAX_SEATS}
          aria-valuenow={seats}
        />
        <div className="relative mt-2 h-4">
          {SEAT_TICKS.map((tick) => (
            <span
              key={tick}
              className="absolute text-xs text-muted-foreground"
              style={{
                left: `${((tick - MIN_SEATS) / (MAX_SEATS - MIN_SEATS)) * 100}%`,
                transform:
                  tick === MIN_SEATS ? "none" : tick === MAX_SEATS ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="mt-4 rounded-2xl bg-status-info-fill px-6 py-5 text-white">
        <p className="text-xs font-medium text-white/80">Annual savings</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {INR(vsAllInOne.savings)}
            <span className="ml-2 text-sm font-medium text-white/80">/ year</span>
          </p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            {vsAllInOne.savingsPct}% less
          </span>
        </div>
      </div>

      <details className="mt-5 group">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-(--lp-accent)">
          Compare against a per-tool stack
          <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            HR + CRM + Chat + Docs separately (Keka + HubSpot + a chat tool + Notion) costs ~
            {INR(vsStack.stackPerSeat)} per seat.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ComparisonCard
              label="Per-tool stack"
              subtitle={`${INR(vsStack.stackPerSeat)} × ${seats} × 12 mo`}
              amount={INR(vsStack.stackAnnual)}
              compact
            />
            <ComparisonCard
              label="StreamlineOS Starter"
              subtitle="One platform"
              amount={INR(vsStack.streamlineAnnual)}
              highlight
              compact
            />
          </div>
          <p className="text-sm font-medium text-status-success-ink">
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
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-status-info-rule bg-status-info-surface"
          : "border-border bg-muted"
      } ${compact ? "" : "sm:p-5"}`}
    >
      <p
        className={`text-xs font-medium ${highlight ? "text-status-info-ink" : "text-muted-foreground"}`}
      >
        {label}
      </p>
      <p
        className={`mt-1 font-semibold tracking-tight tabular-nums ${
          compact ? "text-xl" : "text-2xl"
        } ${highlight ? "text-status-info-ink" : "text-foreground"}`}
      >
        {amount}
        <span className="ml-1.5 text-xs font-medium text-muted-foreground">/ year</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
