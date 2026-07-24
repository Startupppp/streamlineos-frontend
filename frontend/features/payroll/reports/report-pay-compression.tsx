"use client";

import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgPayCompression } from "@/hooks/api/payroll/ess";
import { formatMoney } from "@/features/payroll/shared/payroll-format";

export function ReportPayCompression() {
  const { data, isLoading, isError } = useOrgPayCompression(true);

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }

  if (isError || !data) {
    return (
      <p className="text-[12px] text-muted-foreground">
        Unable to load pay compression (requires payroll:salaries:view).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="status"
        className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <p className="text-[11px] text-amber-900/90 dark:text-amber-100/90 leading-snug">
          {data.honestyNote}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {(
          [
            ["Sample", String(data.sampleSize)],
            ["Median", formatMoney(data.stats.median)],
            ["Mean", formatMoney(data.stats.mean)],
            ["P25", formatMoney(data.stats.p25)],
            ["P75", formatMoney(data.stats.p75)],
            ["Max/Min", data.stats.compressionRatio ? `${data.stats.compressionRatio}×` : "—"],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
            <p className="text-[13px] font-semibold tabular-nums mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {data.outliers.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[12px] font-semibold">
              Distribution outliers ({data.outliers.length})
            </p>
          </div>
          <ul className="divide-y divide-border max-h-48 overflow-y-auto">
            {data.outliers.map((o) => (
              <li
                key={`${o.userId}-${o.side}`}
                className="flex items-center justify-between px-3 py-2 text-[12px]"
              >
                <span>
                  {o.label ?? o.userId}{" "}
                  <span className="text-muted-foreground">({o.side})</span>
                </span>
                <span className="tabular-nums font-medium">{formatMoney(o.annualCtc)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.missingCtcCount > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {data.missingCtcCount} active profile(s) missing usable CTC
        </p>
      )}
    </div>
  );
}
