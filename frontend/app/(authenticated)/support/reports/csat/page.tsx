"use client";

import { MessageSquare, Send, Percent, Star } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { useCsatReport } from "@/hooks/api/support/csat";
import { formatRatioPercent } from "@/features/support/reports/lib/format";

export default function SupportCsatReportPage() {
  const { data, isLoading, isError, refetch } = useCsatReport();

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="CSAT"
      subtitle="Customer satisfaction survey results for resolved tickets."
    >
      {isError ? (
        <ErrorState title="Could not load CSAT report" onRetry={handleRetry} />
      ) : (
        <StatCardGrid cols={4}>
          <StatCard
            label="Total Requests"
            value={data?.totalRequests ?? 0}
            icon={Send}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="Total Responses"
            value={data?.totalResponses ?? 0}
            icon={MessageSquare}
            tone="default"
            isLoading={isLoading}
          />
          <StatCard
            label="Response Rate"
            value={formatRatioPercent(data?.responseRate ?? null)}
            icon={Percent}
            tone="violet"
            isLoading={isLoading}
          />
          <StatCard
            label="Average Score"
            value={data?.averageScore !== null && data?.averageScore !== undefined
              ? data.averageScore.toFixed(2)
              : "—"}
            icon={Star}
            tone="emerald"
            isLoading={isLoading}
          />
        </StatCardGrid>
      )}
    </PageWrapper>
  );
}
