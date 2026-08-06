"use client";

import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { useEssTotalRewards } from "@/hooks/api/payroll/ess";
import { formatMoney } from "@/features/payroll/shared/payroll-format";

export function EssTotalRewardsSection() {
  const { data, isLoading } = useEssTotalRewards();

  if (isLoading) {
    return (
      <section id="total-rewards" className="flex min-h-0 w-full flex-1 flex-col">
        <div className={PAGE_BODY_SKELETON_CLASS}>
          <Skeleton className="h-4 w-48 max-w-full" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="min-h-0 w-full flex-1 rounded-xl" />
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section id="total-rewards" className="flex min-h-0 w-full flex-1 flex-col">
        <EmptyState
          illustrationPreset="payroll"
          title="Total rewards unavailable"
          description="Your rewards summary will appear here once payroll data is available."
          className={PAGE_BODY_EMPTY_CLASS}
        />
      </section>
    );
  }

  return (
    <section id="total-rewards" className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto">
      <p className="shrink-0 text-[11px] text-muted-foreground">
        FY {data.financialYear} · as of {data.asOf} · {data.summary.completeness}
      </p>

      <div
        role="status"
        className="flex shrink-0 gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <p className="text-[11px] leading-snug text-amber-900/90 dark:text-amber-100/90">
          {data.honestyNote}
        </p>
      </div>

      <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Annual CTC</p>
          <p className="mt-1 text-[15px] font-semibold tabular-nums">
            {formatMoney(data.cash.annualCtc)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">YTD gross</p>
          <p className="mt-1 text-[15px] font-semibold tabular-nums">
            {formatMoney(data.cash.ytdGross)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Benefits (employer / yr est.)
          </p>
          <p className="mt-1 text-[15px] font-semibold tabular-nums">
            {formatMoney(data.benefits.estimatedEmployerAnnual)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Equity units
          </p>
          <p className="mt-1 text-[15px] font-semibold tabular-nums">
            {data.equity.totalUnits.toLocaleString("en-IN")}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              not valued
            </span>
          </p>
        </div>
      </div>

      {data.benefits.lines.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[12px] font-semibold">Benefits enrollments</p>
          </div>
          <ul className="divide-y divide-border">
            {data.benefits.lines.map((line) => (
              <li key={`${line.planName}-${line.category}`} className="px-3 py-2">
                <p className="text-[12px] font-medium">
                  {line.planName}{" "}
                  <span className="font-normal text-muted-foreground">· {line.category}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {line.estimatedEmployerMonthly
                    ? `Employer ~${formatMoney(line.estimatedEmployerMonthly)}/mo`
                    : line.note}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.equity.lines.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[12px] font-semibold">Equity grants</p>
          </div>
          <ul className="divide-y divide-border">
            {data.equity.lines.map((line, i) => (
              <li key={`${line.grantType}-${line.grantDate}-${i}`} className="px-3 py-2">
                <p className="text-[12px] font-medium">
                  {line.grantType.toUpperCase()} · {line.units.toLocaleString("en-IN")} units
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Granted {line.grantDate}
                  {line.strikePrice ? ` · strike ${formatMoney(line.strikePrice)}` : ""} ·{" "}
                  {line.note}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.leave.lines.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[12px] font-semibold">Leave balances</p>
          </div>
          <ul className="divide-y divide-border">
            {data.leave.lines.map((line) => (
              <li
                key={line.leaveType}
                className="flex items-center justify-between px-3 py-2 text-[12px]"
              >
                <span>{line.leaveType}</span>
                <span className="font-medium tabular-nums">{line.balanceDays} days</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            {data.leave.note}
          </p>
        </div>
      )}

      {data.summary.missing.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Incomplete sources: {data.summary.missing.join(", ").replace(/_/g, " ")}
        </p>
      )}
    </section>
  );
}
