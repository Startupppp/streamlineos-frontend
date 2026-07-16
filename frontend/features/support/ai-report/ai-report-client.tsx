"use client";

import { useState, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { AiReportStats } from "./ai-report-stats";
import { useSupportAiReport } from "@/hooks/api/support/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";

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

  return (
    <PageWrapper
      title="AI Report"
      subtitle="Support AI performance metrics — acceptance, resolution, escalation, and CSAT impact"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-muted-foreground shrink-0">From</label>
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={handleDateFrom}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <label className="text-xs text-muted-foreground shrink-0">To</label>
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={handleDateTo}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {(filters.dateFrom || filters.dateTo) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>

        {isLoading ? (
          <StatCardGridSkeleton count={7} />
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {getErrorMessage(error)}
            <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
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
