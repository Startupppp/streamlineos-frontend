"use client";

import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEssTotalRewards } from "@/hooks/api/payroll/ess";
import { formatMoney } from "@/features/payroll/shared/payroll-format";

export function EssTotalRewardsSection() {
  const { data, isLoading } = useEssTotalRewards();

  if (isLoading) {
    return (
      <div id="total-rewards" className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <section id="total-rewards" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Total rewards</h2>
          <p className="text-[11px] text-muted-foreground">
            FY {data.financialYear} · as of {data.asOf} · {data.summary.completeness}
          </p>
        </div>
      </div>

      <div
        role="status"
        className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <p className="text-[11px] text-amber-900/90 dark:text-amber-100/90 leading-snug">
          {data.honestyNote}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Annual CTC</p>
          <p className="text-[15px] font-semibold tabular-nums mt-1">
            {formatMoney(data.cash.annualCtc)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">YTD gross</p>
          <p className="text-[15px] font-semibold tabular-nums mt-1">
            {formatMoney(data.cash.ytdGross)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Benefits (employer / yr est.)
          </p>
          <p className="text-[15px] font-semibold tabular-nums mt-1">
            {formatMoney(data.benefits.estimatedEmployerAnnual)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Equity units
          </p>
          <p className="text-[15px] font-semibold tabular-nums mt-1">
            {data.equity.totalUnits.toLocaleString("en-IN")}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              not valued
            </span>
          </p>
        </div>
      </div>

      {data.benefits.lines.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[12px] font-semibold">Benefits enrollments</p>
          </div>
          <ul className="divide-y divide-border">
            {data.benefits.lines.map((line) => (
              <li key={`${line.planName}-${line.category}`} className="px-3 py-2">
                <p className="text-[12px] font-medium">
                  {line.planName}{" "}
                  <span className="text-muted-foreground font-normal">· {line.category}</span>
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
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
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
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[12px] font-semibold">Leave balances</p>
          </div>
          <ul className="divide-y divide-border">
            {data.leave.lines.map((line) => (
              <li
                key={line.leaveType}
                className="flex items-center justify-between px-3 py-2 text-[12px]"
              >
                <span>{line.leaveType}</span>
                <span className="tabular-nums font-medium">{line.balanceDays} days</span>
              </li>
            ))}
          </ul>
          <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">
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
