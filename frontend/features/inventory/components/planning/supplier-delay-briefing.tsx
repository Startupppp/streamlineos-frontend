"use client";

import { memo } from "react";
import { RefreshCw, TruckIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useSupplierDelayBriefing,
  type SupplierDelayVendor,
} from "@/hooks/api/inv-ai-explain";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

interface VendorMetricProps {
  label: string;
  value: string;
  highlight?: boolean;
}

const VendorMetric = memo(function VendorMetric({ label, value, highlight }: VendorMetricProps) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/40 px-2 py-1.5">
      <span className="text-micro text-muted-foreground">{label}</span>
      <span
        className={`text-xs font-semibold ${highlight ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
});

interface VendorDelayCardProps {
  vendor: SupplierDelayVendor;
}

const VendorDelayCard = memo(function VendorDelayCard({ vendor }: VendorDelayCardProps) {
  const p = vendor.performance;
  const lowOnTime = p.onTimeRate < 0.8;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TruckIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground truncate">
            {vendor.vendorName}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-micro h-4 px-1 shrink-0 border-destructive/30 bg-destructive/5 text-destructive"
        >
          {vendor.insightCount} delay insight{vendor.insightCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <VendorMetric label="On-Time Rate" value={formatPercent(p.onTimeRate)} highlight={lowOnTime} />
        <VendorMetric label="Fill Rate" value={formatPercent(p.fillRate)} />
        <VendorMetric label="Avg Lead Time" value={`${p.avgLeadTimeDays}d`} />
        <VendorMetric label="Return Rate" value={formatPercent(p.returnRate)} />
        <VendorMetric label="Open POs" value={String(p.openPoCount)} />
        <VendorMetric label="Total Spend" value={formatCurrency(p.totalSpend)} />
      </div>
    </div>
  );
});

interface SupplierDelayBriefingProps {
  vendorId?: string;
}

export const SupplierDelayBriefing = memo(function SupplierDelayBriefing({
  vendorId,
}: SupplierDelayBriefingProps) {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useSupplierDelayBriefing(vendorId);

  function handleRefetch(): void {
    void refetch();
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-label font-semibold text-foreground">
            Supplier Delay Briefing
          </CardTitle>
          <LoadingButton
            variant="outline"
            size="sm"
            className="h-7 text-micro gap-1.5"
            onClick={handleRefetch}
            isPending={isFetching}
            loadingText="Refreshing…"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </LoadingButton>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="px-4 pb-4 pt-3 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4 rounded-md" />
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {isError && (
          <p className="text-dense text-destructive">{getErrorMessage(error)}</p>
        )}

        {!isLoading && !isError && data && (
          <>
            {data.narration && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
                    AI Briefing
                  </p>
                  <AiGeneratedLabel timestamp={data.generatedAt} />
                </div>
                <p className="text-dense text-muted-foreground leading-relaxed">
                  {data.narration}
                </p>
              </div>
            )}

            {data.vendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <TruckIcon className="h-7 w-7 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-medium text-foreground">No supplier delays detected</p>
                <p className="text-dense text-muted-foreground mt-0.5">
                  All vendors are within expected delivery windows.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.vendors.map((vendor) => (
                  <VendorDelayCard key={vendor.vendorId} vendor={vendor} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
