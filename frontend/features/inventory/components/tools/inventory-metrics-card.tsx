"use client";

import { toast } from "sonner";
import { AlertTriangle, Clock, Inbox, Radio, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useInventoryMetrics, useRunExpirySweep } from "@/hooks/api/inventory/system-health";

/**
 * The six numbers that say whether inventory is quietly broken.
 *
 * `GET /inventory/metrics` had no caller, so a dead outbox — the state where an
 * inventory webhook has been retried to exhaustion and dropped — showed up
 * nowhere in the product. Neither did a negative stock level, which is only
 * legitimate when the workspace has turned negative stock on.
 */
export function InventoryMetricsCard() {
  const { data, isLoading, isError, error, refetch } = useInventoryMetrics();
  const sweep = useRunExpirySweep();

  function handleRetry(): void {
    void refetch();
  }

  function handleSweep(): void {
    sweep.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          result.events === 0
            ? "Nothing is expiring — no notifications were raised."
            : `Raised ${String(result.events)} expiry ${result.events === 1 ? "notification" : "notifications"}.`,
        );
      },
      onError: (sweepError) => toast.error(getErrorMessage(sweepError)),
    });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">System health</CardTitle>
          <p className="text-dense text-muted-foreground">
            Invariants, ageing reservations and event delivery for this workspace.
          </p>
        </div>
        <LoadingButton
          variant="outline"
          size="sm"
          isPending={sweep.isPending}
          loadingText="Sweeping…"
          onClick={handleSweep}
        >
          Run expiry sweep
        </LoadingButton>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState
            title="Couldn't read the gauges"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : isLoading ? (
          <StatCardGridSkeleton count={5} />
        ) : (
          <StatCardGrid cols={5}>
            <StatCard
              label="Negative stock levels"
              value={String(data?.invariants.negativeLevels ?? 0)}
              icon={AlertTriangle}
              tone={data && data.invariants.negativeLevels > 0 ? "red" : "emerald"}
              hint="Expected only where negative stock is allowed"
            />
            <StatCard
              label="Orphaned reservations"
              value={String(data?.invariants.orphanedReservations ?? 0)}
              icon={Radio}
              tone={data && data.invariants.orphanedReservations > 0 ? "red" : "emerald"}
              hint="Holding stock for an order that no longer exists"
            />
            <StatCard
              label="Expired, still holding"
              value={String(data?.ageing.expiredUnreleasedReservations ?? 0)}
              icon={Clock}
              tone={data && data.ageing.expiredUnreleasedReservations > 0 ? "amber" : "emerald"}
              hint="Past their expiry and never released"
            />
            <StatCard
              label="Events waiting"
              value={String(data?.outbox.pending ?? 0)}
              icon={Inbox}
              tone={data && data.outbox.pending > 0 ? "amber" : "default"}
              hint={
                data?.outbox.lagSeconds === null || data?.outbox.lagSeconds === undefined
                  ? "Nothing is queued"
                  : `Oldest is ${Math.round(data.outbox.lagSeconds)}s behind`
              }
            />
            <StatCard
              label="Events dropped"
              value={String(data?.outbox.dead ?? 0)}
              icon={Upload}
              tone={data && data.outbox.dead > 0 ? "red" : "emerald"}
              hint="Retried to exhaustion and dead-lettered"
            />
          </StatCardGrid>
        )}

        {data && data.imports.failedJobs > 0 ? (
          <p className="mt-3 text-dense text-muted-foreground">
            {data.imports.failedJobs} import {data.imports.failedJobs === 1 ? "job" : "jobs"} failed
            and were never retried.
          </p>
        ) : null}
        {data ? <p className="mt-3 text-dense text-muted-foreground">{data.countersNote}</p> : null}
      </CardContent>
    </Card>
  );
}
