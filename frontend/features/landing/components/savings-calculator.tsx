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
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 md:p-8 shadow-sm min-w-0">
      <div className="mb-6 sm:mb-8">
        <label
          htmlFor="seats-slider"
          className="mb-3 flex items-center justify-between gap-3 text-sm"
        >
          <span className="inline-flex items-center gap-2 font-medium text-muted-foreground min-w-0">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            Team size
          </span>
          <span className="font-display text-xl sm:text-2xl font-bold tabular-nums text-muted-foreground shrink-0">
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
          onChange={(e) => setSeats(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-blue-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-sm"
          aria-label="Number of users"
          aria-valuemin={MIN_SEATS}
          aria-valuemax={MAX_SEATS}
          aria-valuenow={seats}
        />
        <div className="relative mt-2 h-4">
          {SEAT_TICKS.map((tick) => {
            const pct = seatTickPosition(tick);
            const isMin = tick === MIN_SEATS;
            const isMax = tick === MAX_SEATS;
            return (
              <span
                key={tick}
                className="absolute text-xs text-muted-foreground"
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

      <div className="mt-4 rounded-xl bg-blue-600 px-5 py-4 text-white">
        <p className="text-xs font-medium text-status-info-ink">Annual savings</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <p className="font-display text-3xl font-extrabold tabular-nums">
            {INR(vsAllInOne.savings)}
            <span className="ml-2 text-sm font-medium text-status-info-ink">/ year</span>
          </p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            {vsAllInOne.savingsPct}% less
          </span>
        </div>
      </div>

      <details className="mt-5 group">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-muted-foreground">
          Compare against a per-tool stack
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
              label="StreamlineOS Startup"
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
      className={`rounded-xl border p-4 ${
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
        className={`mt-1 font-display font-bold tabular-nums tracking-tight ${
          compact ? "text-xl" : "text-2xl"
        } ${highlight ? "text-status-info-ink" : "text-muted-foreground"}`}
      >
        {amount}
        <span className="ml-1.5 text-xs font-medium text-muted-foreground">/ year</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
