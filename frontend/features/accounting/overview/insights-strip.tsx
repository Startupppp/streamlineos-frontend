"use client";

import Link from "next/link";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useAnomalies, useInsightsDigest } from "@/hooks/api/accounting/insights";
import type { Anomaly, AnomalySeverity } from "@/hooks/api/accounting/insights";

const DRILL_ROUTES: Record<string, string> = {
  invoices: "/accounting/invoices",
  "purchase-bills": "/accounting/purchase-bills",
  banking: "/accounting/banking/reconciliation",
  budgets: "/accounting/budgets",
};

function drillHref(anomaly: Anomaly): string {
  return DRILL_ROUTES[anomaly.drill.type] ?? "#";
}

function severityClasses(severity: AnomalySeverity): string {
  if (severity === "critical") {
    return "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30";
  }
  if (severity === "warning") {
    return "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30";
  }
  return "bg-muted border-border";
}

function severityTextClass(severity: AnomalySeverity): string {
  if (severity === "critical") return "text-red-700 dark:text-red-300";
  if (severity === "warning") return "text-amber-700 dark:text-amber-300";
  return "text-muted-foreground";
}

function severityDotClass(severity: AnomalySeverity): string {
  if (severity === "critical") return "bg-red-500";
  if (severity === "warning") return "bg-amber-500";
  return "bg-muted-foreground";
}

export function InsightsStrip({ from, to }: { from?: string; to?: string }) {
  const digestQuery = useInsightsDigest();
  const anomaliesQuery = useAnomalies({ from, to });

  const digest = digestQuery.data;
  const anomalies = anomaliesQuery.data?.slice(0, 6) ?? [];

  if (!digest && anomalies.length === 0) return null;

  return (
    <div className="space-y-3">
      {digest && (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            AI Digest
          </p>
          <p className="text-sm font-medium text-foreground">{digest.headline}</p>
          {(digest.positives.length > 0 || digest.watchouts.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              {digest.positives.map((p) => (
                <span key={p} className="text-xs text-emerald-700 dark:text-emerald-400">
                  + {p}
                </span>
              ))}
              {digest.watchouts.map((w) => (
                <span key={w} className="text-xs text-amber-700 dark:text-amber-400">
                  ! {w}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {anomalies.map((anomaly) => (
            <Link
              key={anomaly.id}
              href={drillHref(anomaly)}
              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 hover:opacity-80 transition-opacity ${severityClasses(anomaly.severity)}`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDotClass(anomaly.severity)}`}
              />
              <div className="min-w-0">
                <p className={`text-xs font-semibold leading-tight ${severityTextClass(anomaly.severity)}`}>
                  {anomaly.title}
                </p>
                <TruncatedText text={anomaly.detail ?? ""} lines={2} className="text-xs text-muted-foreground mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
