"use client";

import { cn } from "@/lib/utils";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { useRunVariance } from "@/hooks/api/payroll/run-employees";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TrendingUp } from "lucide-react";

interface VarianceTabProps {
  runId: number;
}

export function VarianceTab({ runId }: VarianceTabProps) {
  const { data, isLoading, isError, refetch } = useRunVariance(runId);

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <StatCardGrid cols={3}>
          <StatCard label="Current Net" value="—" isLoading />
          <StatCard label="Previous Net" value="—" isLoading />
          <StatCard label="Net Delta" value="—" isLoading />
        </StatCardGrid>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load variance"
        description="This run's variance could not be loaded. Retry before treating the run as unchanged."
        onRetry={handleRetry}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState compact title="Variance data unavailable" description="Generate payroll to see variance" />
    );
  }

  const { currentRun, previousRun, topMovers } = data;

  const currentNet = parseFloat(currentRun.netTotal ?? "0");
  const previousNet = parseFloat(previousRun?.netTotal ?? "0");
  const netDelta = previousRun ? currentNet - previousNet : null;
  const netDeltaPct =
    netDelta !== null && previousNet !== 0
      ? ((netDelta / previousNet) * 100).toFixed(1)
      : null;

  return (
    <div className="space-y-4">
      <StatCardGrid cols={3}>
        <StatCard
          label="Current Net Payable"
          value={formatMoney(currentRun.netTotal)}
          tone="blue"
          icon={TrendingUp}
        />
        <StatCard
          label="Previous Net Payable"
          value={previousRun ? formatMoney(previousRun.netTotal) : "—"}
        />
        <StatCard
          label="Net Delta"
          value={
            netDelta !== null
              ? `${netDelta >= 0 ? "+" : ""}${formatMoney(netDelta.toFixed(2))}`
              : "—"
          }
          tone={netDelta === null ? "default" : netDelta >= 0 ? "emerald" : "red"}
          hint={netDeltaPct !== null ? `${netDeltaPct}% vs previous` : undefined}
        />
      </StatCardGrid>

      <div className="rounded-md border border-border overflow-hidden">
        <div className="px-3 py-2 border-b bg-muted/30">
          <span className="text-dense font-semibold text-foreground">Top Earners This Run</span>
        </div>
        {topMovers.length === 0 ? (
          <div className="px-3 py-4 text-dense text-muted-foreground text-center">
            No employee data
          </div>
        ) : (
          topMovers.map((emp, idx) => (
            <div
              key={emp.userId}
              className={cn(
                "flex items-center justify-between px-3 py-2 text-dense",
                idx > 0 && "border-t border-border",
              )}
            >
              <TruncatedText text={emp.userName ?? emp.userId ?? ""} className="text-foreground font-medium min-w-0 flex-1" />
              <span className="font-mono tabular-nums text-foreground">
                {formatMoney(emp.net)}
              </span>
            </div>
          ))
        )}
      </div>

      {!previousRun && (
        <p className="text-dense text-muted-foreground">
          No previous run found — variance comparison unavailable.
        </p>
      )}
    </div>
  );
}
