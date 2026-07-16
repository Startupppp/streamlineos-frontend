"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportShell } from "./report-shell";
import { DateRangeFilter } from "./date-range-filter";
import { ProfitabilityTable } from "./profitability-table";
import { useProjectProfitability } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/features/accounting/shared";

function currentYearRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export function ProjectProfitabilityReport() {
  const router = useRouter();
  const params = useSearchParams();
  const defaults = currentYearRange();
  const [from, setFrom] = useState(params.get("from") ?? defaults.from);
  const [to, setTo] = useState(params.get("to") ?? defaults.to);

  const { data, isLoading, error, refetch } = useProjectProfitability(from, to);

  function updateUrl(f: string, t: string): void {
    router.replace(`/accounting/reports/project-profitability?from=${f}&to=${t}`);
  }

  function handleFromChange(v: string): void {
    setFrom(v);
    updateUrl(v, to);
  }

  function handleToChange(v: string): void {
    setTo(v);
    updateUrl(from, v);
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleExport(): void {
    void downloadCsv(
      "/accounting/reports/project-profitability/export",
      { from, to },
      `project-profitability-${from}-${to}.csv`,
    );
  }

  return (
    <ReportShell
      title="Project Profitability"
      subtitle="Revenue, cost, and margin per project from journal and expense data."
      onExport={handleExport}
      filters={
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          idPrefix="pp"
        />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/5" />
                <Skeleton className="h-8 w-1/5" />
                <Skeleton className="h-8 w-1/5" />
                <Skeleton className="h-8 w-1/5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Failed to load report"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            illustration={<EmptyReportIllustration />}
            title="No project data"
            description="No project profitability data found for the selected period."
            compact
          />
        ) : (
          <ProfitabilityTable data={data} nameKey="projectName" />
        )}
      </div>
    </ReportShell>
  );
}
