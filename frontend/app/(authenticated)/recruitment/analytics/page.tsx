"use client";

import dynamic from "next/dynamic";
import {
  Briefcase,
  Users,
  UserCheck,
  Calendar,
  Clock,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { useRecruitmentStats } from "@/hooks/api/hr/recruitment";
import { ErrorState } from "@/components/shared/error-state";
import { ConversionSection } from "@/features/recruitment/analytics/conversion-section";

const RecruitmentAnalyticsCharts = dynamic(
  () => import("@/features/recruitment/components/recruitment-analytics-charts").then((m) => ({ default: m.RecruitmentAnalyticsCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[268px] rounded-xl" />
        <Skeleton className="h-[268px] rounded-xl" />
      </div>
    ),
  },
);

const FUNNEL_STAGES = [
  "NEW",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const;
const FUNNEL_LABELS: Record<string, string> = {
  NEW: "New",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

export default function RecruitmentAnalyticsPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useRecruitmentStats();

  const isLoading = statsLoading;
  const isError = statsError;

  const funnelData = FUNNEL_STAGES.map((stage) => ({
    stage: FUNNEL_LABELS[stage],
    count: stats?.funnel?.[stage] ?? 0,
  }));

  const sourceData = (stats?.sources ?? [])
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  function handleRetry() {
    void refetchStats();
  }

  return (
    <PageWrapper
      title="Recruitment Analytics"
      subtitle="Track hiring performance and pipeline health">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {isError ? (
          <ErrorState
            title="Unable to load recruitment analytics"
            description="Try again. If this keeps happening, check your permissions or contact an admin."
            onRetry={handleRetry}
          />
        ) : isLoading ? (
          <StatCardGridSkeleton cols={3} />
        ) : (
          <>
            <StatCardGrid cols={3}>
              <StatCard
                label="Total Jobs"
                value={stats?.totalJobs ?? 0}
                hint={`${stats?.openJobs ?? 0} open`}
                icon={Briefcase}
                tone="blue"
              />
              <StatCard
                label="Total Candidates"
                value={stats?.totalCandidates ?? 0}
                hint={`${stats?.newCandidates ?? 0} new`}
                icon={Users}
                tone="default"
              />
              <StatCard
                label="Hired This Month"
                value={stats?.hiredThisMonth ?? 0}
                icon={UserCheck}
                tone="emerald"
              />
              <StatCard
                label="Upcoming Interviews"
                value={stats?.upcomingInterviews ?? 0}
                icon={Calendar}
                tone="amber"
              />
              <StatCard
                label="Avg. Days to Hire"
                value={stats?.avgTimeToHireDays ?? 0}
                hint="from application to hired"
                icon={Clock}
                tone="blue"
              />
            </StatCardGrid>
            <RecruitmentAnalyticsCharts
              funnelData={funnelData}
              sourceData={sourceData}
              isLoading={isLoading}
            />
            {/*
              A second funnel, deliberately labelled rather than merged with the
              one above. That chart counts candidates by their current status —
              the pipeline right now, with everybody who already passed through
              missing from it. This section counts applications and keeps their
              terminal status, which is what a conversion rate measures. They
              are different numbers and a reader has to be able to tell which
              question they are looking at the answer to.
            */}
            <ConversionSection />
          </>
        )}
      </div>
    </PageWrapper>
  );
}
