"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { usePaymentReadiness } from "@/hooks/api/payments";
import { Skeleton } from "@/components/ui/skeleton";

export function ReadinessRail({ providerKey }: { providerKey: string | null }) {
  const { data: readiness, isLoading } = usePaymentReadiness(providerKey ?? "", !!providerKey);

  if (!providerKey) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Select a provider to see its readiness status.</p>
      </div>
    );
  }

  if (isLoading || !readiness) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {readiness.readyForLive ? "Ready for live payments" : "Live readiness"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {readiness.completedChecks.length} check{readiness.completedChecks.length === 1 ? "" : "s"} passed
        </p>
      </div>

      {readiness.blockers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Blockers</p>
          {readiness.blockers.map((blocker) => (
            <div key={blocker} className="flex items-start gap-1.5 text-[12px] text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{blocker}</span>
            </div>
          ))}
        </div>
      )}

      {readiness.warnings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Warnings</p>
          {readiness.warnings.map((warning) => (
            <div key={warning} className="flex items-start gap-1.5 text-[12px] text-amber-700 dark:text-amber-400">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {readiness.completedChecks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Completed</p>
          {readiness.completedChecks.map((check) => (
            <div key={check} className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>{check.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
