"use client";

import { useCallback } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { usePaymentReadiness } from "@/hooks/api/payments";
import { useCan } from "@/hooks/api/access";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { Skeleton } from "@/components/ui/skeleton";

export function ReadinessRail({ providerKey }: { providerKey: string | null }) {
  const canView = useCan("payments:providers:view");
  const {
    data: readiness,
    isLoading,
    isError,
    error,
    refetch,
  } = usePaymentReadiness(providerKey ?? "", !!providerKey);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (!providerKey) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Select a provider to see its readiness status.</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <NoPermissionState
          compact
          permission="payments:providers:view"
          title="Readiness hidden"
          description="You do not have permission to view this provider's live readiness checks."
        />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        compact
        title="Failed to load readiness"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
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
        <p className="text-dense text-muted-foreground mt-0.5">
          {readiness.completedChecks.length} check{readiness.completedChecks.length === 1 ? "" : "s"} passed
        </p>
      </div>

      {readiness.blockers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-dense font-semibold text-status-danger-ink uppercase tracking-wide">Blockers</p>
          {readiness.blockers.map((blocker) => (
            <div key={blocker} className="flex items-start gap-1.5 text-xs text-status-danger-ink">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{blocker}</span>
            </div>
          ))}
        </div>
      )}

      {readiness.warnings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-dense font-semibold text-status-warning-ink uppercase tracking-wide">Warnings</p>
          {readiness.warnings.map((warning) => (
            <div key={warning} className="flex items-start gap-1.5 text-xs text-status-warning-ink">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {readiness.completedChecks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-dense font-semibold text-status-success-ink uppercase tracking-wide">Completed</p>
          {readiness.completedChecks.map((check) => (
            <div key={check} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-status-success-ink" />
              <span>{check.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
