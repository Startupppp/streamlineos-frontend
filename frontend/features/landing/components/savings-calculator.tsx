"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, TrendingDown, Sparkles } from "lucide-react";
import {
  calculateSavingsVsOdoo,
  calculateSavingsVsStack,
  COMPETITOR_PRICES,
  PRICING_TIERS,
} from "@/lib/pricing";

const INR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function SavingsCalculator() {
  const [seats, setSeats] = useState(20);

  const vsOdoo = useMemo(() => calculateSavingsVsOdoo(seats, "annual"), [seats]);
  const vsStack = useMemo(() => calculateSavingsVsStack(seats), [seats]);

  const startupAnnual = PRICING_TIERS[1].annual ?? 319;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 lg:p-10 shadow-[0_24px_60px_-20px_rgba(30,64,175,0.14)]">
      <div className="flex items-start gap-3 mb-7">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shrink-0 shadow-[0_10px_24px_-8px_rgba(59,130,246,0.5)]">
          <TrendingDown className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl lg:text-2xl font-bold text-slate-900 leading-tight">
            See your savings
          </h3>
          <p className="text-[13px] text-slate-600 mt-1">
            Compared to Odoo Standard ({INR(COMPETITOR_PRICES.odooStandard)}/seat) and the
            typical per-tool stack.
          </p>
        </div>
      </div>

      <div className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <label
            htmlFor="seats-slider"
            className="text-[12px] font-medium text-slate-500 inline-flex items-center gap-2"
          >
            <Users className="h-3.5 w-3.5" />
            Team size
          </label>
          <span className="font-display text-2xl font-extrabold text-slate-900 tabular-nums">
            {seats}
            <span className="text-sm font-medium text-slate-500 ml-1.5">users</span>
          </span>
        </div>
        <input
          id="seats-slider"
          type="range"
          min={3}
          max={200}
          step={1}
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-cyan-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
          aria-label="Number of users"
        />
        <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-400">
          <span>3</span>
          <span>50</span>
          <span>100</span>
          <span>200</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <ComparisonCard
          label="Odoo Standard"
          subtitle={`${INR(COMPETITOR_PRICES.odooStandard)} × ${seats} × 12mo`}
          amount={INR(vsOdoo.odooAnnual)}
          variant="muted"
        />
        <ComparisonCard
          label="StreamlineOS Startup"
          subtitle={`${INR(startupAnnual)} × ${seats} × 12mo (annual)`}
          amount={INR(vsOdoo.streamlineAnnual)}
          variant="primary"
        />
      </div>

      <motion.div
        key={seats}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 p-5 lg:p-6 text-white shadow-[0_18px_44px_-18px_rgba(30,64,175,0.4)]"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium opacity-85 mb-1">
              You save vs Odoo
            </p>
            <p className="font-display text-3xl lg:text-4xl font-extrabold tabular-nums">
              {INR(vsOdoo.savings)}
              <span className="text-base font-medium opacity-85 ml-2">/ year</span>
            </p>
          </div>
          <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-mono text-sm font-bold">{vsOdoo.savingsPct}% off</span>
          </div>
        </div>
      </motion.div>

      <details className="mt-5 group">
        <summary className="cursor-pointer text-[12px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
          See per-tool stack comparison
        </summary>
        <div className="mt-4 rounded-2xl bg-slate-50/70 border border-slate-200 p-5">
          <p className="text-[12px] text-slate-600 mb-4 leading-relaxed">
            Buying HR + CRM + Chat + Docs separately (Keka + HubSpot Starter + Slack Pro +
            Notion) costs ~{INR(vsStack.stackPerSeat)} per seat.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <ComparisonCard
              label="Per-tool stack"
              subtitle={`${INR(vsStack.stackPerSeat)} × ${seats} × 12mo`}
              amount={INR(vsStack.stackAnnual)}
              variant="muted"
              compact
            />
            <ComparisonCard
              label="StreamlineOS Startup"
              subtitle="One platform"
              amount={INR(vsStack.streamlineAnnual)}
              variant="primary"
              compact
            />
          </div>
          <p className="text-[13px] font-semibold text-emerald-700">
            You save {INR(vsStack.savings)} / year ({vsStack.savingsPct}% off the stack)
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
  variant,
  compact = false,
}: {
  label: string;
  subtitle: string;
  amount: string;
  variant: "muted" | "primary";
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${compact ? "" : "lg:p-5"} border ${
        variant === "primary"
          ? "border-blue-200 bg-blue-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-[11px] font-medium mb-1 ${
          variant === "primary" ? "text-blue-700" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`font-display ${compact ? "text-xl" : "text-2xl"} font-extrabold tracking-tight tabular-nums ${
          variant === "primary" ? "text-blue-900" : "text-slate-900"
        }`}
      >
        {amount}
        <span className="text-xs font-medium text-slate-500 ml-1.5">/ year</span>
      </p>
      <p className="text-[11px] text-slate-500 font-mono mt-1.5">{subtitle}</p>
    </div>
  );
}
