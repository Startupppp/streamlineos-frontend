"use client";

import { useCallback } from "react";
import { AlertTriangle, Ban, Clock, Percent, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingLeakageReport } from "@/hooks/api/timesheets-core/reports";
import type { BillingLeakageReport } from "./reports-types";
import { formatReportHours, formatReportMoney, formatReportPercent } from "./report-format";

interface BillingLeakageTabProps {
  params: { startDate: string; endDate: string };
  enabled: boolean;
}

export function BillingLeakageTab({ params, enabled }: BillingLeakageTabProps) {
  const { data, isLoading, isError, error, refetch } = useBillingLeakageReport(params, enabled);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const state = usePageState({
    permission: "timesheets:reports:view",
    isLoading: !isError && (isLoading || !data),
    isError,
    error,
  });

  return (
    <PageState
      resolution={state}
      onRetry={handleRetry}
      loading={
        <div className="space-y-4">
          <StatCardGridSkeleton cols={4} count={4} />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[160px] rounded-lg" />
            <Skeleton className="h-[160px] rounded-lg" />
          </div>
        </div>
      }
    >
      {data ? <BillingLeakageBody data={data} /> : null}
    </PageState>
  );
}

function BillingLeakageBody({ data }: { data: BillingLeakageReport }) {
  const hasActivity =
    data.billableHours > 0 ||
    data.nonBillableHours > 0 ||
    data.voidedHours > 0 ||
    data.approvedBillableUninvoiced.hours > 0;

  return (
    <div className="space-y-4">
      <StatCardGrid cols={4}>
        <StatCard
          label="Billable Hours"
          value={data.billableHours.toFixed(1)}
          icon={Clock}
          tone="emerald"
        />
        <StatCard
          label="Non-billable Hours"
          value={data.nonBillableHours.toFixed(1)}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Write-off Rate"
          value={formatReportPercent(data.writeOffRate)}
          icon={Percent}
          tone={data.writeOffRate > 0.2 ? "red" : "default"}
        />
        <StatCard
          label="Voided Hours"
          value={data.voidedHours.toFixed(1)}
          icon={Ban}
          tone={data.voidedHours > 0 ? "red" : "default"}
        />
      </StatCardGrid>

      {!hasActivity ? (
        <EmptyState
          illustrationPreset="chart"
          title="No approved activity"
          description="No approved time entries were found in this date range."
          className="min-h-[40dvh]"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                Approved but Uninvoiced
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-semibold tabular-nums">
                {formatReportHours(data.approvedBillableUninvoiced.hours)}
              </p>
              {data.approvedBillableUninvoiced.amounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No priced uninvoiced hours — nothing to bill yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {data.approvedBillableUninvoiced.amounts.map((a) => (
                    <div
                      key={a.currency}
                      className="flex items-center justify-between text-sm tabular-nums"
                    >
                      <span className="text-muted-foreground">{a.currency}</span>
                      <span className="font-medium">{formatReportMoney(a.amount, a.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Leakage Signals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Billable hours missing a rate</span>
                <span
                  className={
                    data.missingRateHours > 0
                      ? "font-medium tabular-nums text-status-warning-ink"
                      : "font-medium tabular-nums"
                  }
                >
                  {formatReportHours(data.missingRateHours)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Voided hours in range</span>
                <span
                  className={
                    data.voidedHours > 0
                      ? "font-medium tabular-nums text-status-danger-ink"
                      : "font-medium tabular-nums"
                  }
                >
                  {formatReportHours(data.voidedHours)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Write-off rate</span>
                <span className="font-medium tabular-nums">
                  {formatReportPercent(data.writeOffRate)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
