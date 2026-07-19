"use client";

import { MessageSquare, Send, Percent, Star, Megaphone, Info } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { useCsatReport } from "@/hooks/api/support/csat";
import { formatRatioPercent } from "@/features/support/reports/lib/format";

function formatScore(score: number | null | undefined): string {
  return score !== null && score !== undefined ? score.toFixed(2) : "—";
}

export default function SupportCsatReportPage() {
  const { data, isLoading, isError, refetch } = useCsatReport();

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="CSAT"
      subtitle="Customer satisfaction across every source — per-ticket surveys and CRM campaigns."
    >
      {isError ? (
        <ErrorState title="Could not load CSAT report" onRetry={handleRetry} />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Per-Ticket CSAT</h3>
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
                tone="blue"
                isLoading={isLoading}
              />
              <StatCard
                label="Average Score"
                value={formatScore(data?.averageScore)}
                icon={Star}
                tone="emerald"
                isLoading={isLoading}
              />
            </StatCardGrid>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">CRM Campaign CSAT</h3>
            {!isLoading && !data?.sources.crmCampaigns ? (
              <p className="text-sm text-muted-foreground">No CRM CSAT campaigns have been sent yet.</p>
            ) : (
              <StatCardGrid cols={3}>
                <StatCard
                  label="Campaigns Sent"
                  value={data?.sources.crmCampaigns?.totalSurveys ?? 0}
                  icon={Megaphone}
                  tone="blue"
                  isLoading={isLoading}
                />
                <StatCard
                  label="Total Responses"
                  value={data?.sources.crmCampaigns?.totalResponses ?? 0}
                  icon={MessageSquare}
                  tone="default"
                  isLoading={isLoading}
                />
                <StatCard
                  label="Average Score (normalized to 5)"
                  value={formatScore(data?.sources.crmCampaigns?.averageScore)}
                  icon={Star}
                  tone="emerald"
                  isLoading={isLoading}
                />
              </StatCardGrid>
            )}
          </div>

          {data?.sources.generalSurveys && (
            <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>{data.sources.generalSurveys.reason}</p>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
