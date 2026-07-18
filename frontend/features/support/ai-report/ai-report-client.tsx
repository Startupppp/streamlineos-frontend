"use client";

import { useState, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { AiReportStats } from "./ai-report-stats";
import { useSupportAiReport } from "@/hooks/api/support/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

interface DateFilters {
  dateFrom?: string;
  dateTo?: string;
}

export function AiReportClient() {
  const [filters, setFilters] = useState<DateFilters>({});
  const { data, isLoading, isError, error, refetch } = useSupportAiReport(filters);

  const handleDateFrom = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, dateFrom: e.target.value || undefined }));
  }, []);

  const handleDateTo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, dateTo: e.target.value || undefined }));
  }, []);

  const handleClear = useCallback(() => setFilters({}), []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="AI Report"
      subtitle="Support AI performance metrics — acceptance, resolution, escalation, and CSAT impact"
    >
      <div className="space-y-4">
        <div className={FILTER_TOOLBAR_ROW}>
          <label className="text-xs text-muted-foreground shrink-0">From</label>
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={handleDateFrom}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <label className="text-xs text-muted-foreground shrink-0">To</label>
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={handleDateTo}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {(filters.dateFrom || filters.dateTo) && (
            <Button variant="ghost" size="sm" className="h-9 text-sm" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>

        {isLoading ? (
          <StatCardGridSkeleton count={7} />
        ) : isError ? (
          <ErrorState
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            compact
          />
        ) : !data ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-foreground/70">No AI data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              AI metrics appear once agents start using AI suggestions on tickets.
            </p>
          </div>
        ) : (
          <AiReportStats data={data} />
        )}
      </div>
    </PageWrapper>
  );
}
