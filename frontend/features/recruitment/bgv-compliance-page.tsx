"use client";

import { useCallback } from "react";
import { useBgvComplianceDashboard, type BgvComplianceRow } from "@/hooks/api/hr/recruitment";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { RecruitmentEmptyState } from "@/features/recruitment/components/recruitment-empty-state";

interface ComplianceCardProps {
  row: BgvComplianceRow;
}

function ComplianceCard({ row }: ComplianceCardProps) {
  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">{row.jobTitle}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4 space-y-2">
        <div className="flex items-center gap-2">
          <Progress value={row.clearedPct} className="flex-1 h-2 bg-muted [&>div]:bg-status-success-fill" />
          <span className="text-xs font-semibold text-status-success-ink tabular-nums w-10 text-right">
            {row.clearedPct}%
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-dense tabular-nums">
          <span className="text-muted-foreground">
            Total: <span className="font-medium text-foreground">{row.total}</span>
          </span>
          <span className="text-status-success-ink">
            Cleared: <span className="font-medium">{row.cleared}</span>
          </span>
          <span className="text-status-warning-ink">
            Pending: <span className="font-medium">{row.pending}</span>
          </span>
          <span className="text-status-info-ink">
            Initiated: <span className="font-medium">{row.initiated}</span>
          </span>
          <span className="text-status-danger-ink">
            Failed: <span className="font-medium">{row.failed}</span>
          </span>
          <span className="text-muted-foreground">
            Not initiated: <span className="font-medium">{row.notInitiated}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Candidate background-verification completion per job posting. Moved here from the HR BGV page. */
export function BgvCompliancePage() {
  const { data: rows, isLoading, isError, error, refetch } = useBgvComplianceDashboard();
  const pageState = usePageState({
    permission: "hr:sensitive:view",
    isLoading,
    isError,
    error,
    isEmpty: rows !== undefined && rows.length === 0,
  });
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Candidate BGV Compliance"
      subtitle="Share of candidates per job posting with cleared background verification"
      backHref="/recruitment/settings"
      state={pageState}
      onRetry={handleRetry}
      loading={
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      }
      empty={
        <RecruitmentEmptyState
          illustrationPreset="chart"
          title="No candidate BGV data yet"
          description="Candidate background verification data will appear here."
          className={CONTENT_FILL_PANEL}
        />
      }
    >
      <div className="space-y-3">
        {rows?.map((row) => (
          <ComplianceCard key={row.jobPostingId} row={row} />
        ))}
      </div>
    </PageWrapper>
  );
}
