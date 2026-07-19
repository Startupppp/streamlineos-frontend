"use client";

import dynamic from "next/dynamic";
import {
  Briefcase,
  Users,
  UserCheck,
  Calendar,
  Clock,
  Percent,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import {
  useRecruitmentStats,
  useRecruitmentAnalytics,
} from "@/hooks/api/hr/recruitment";

const RecruitmentAnalyticsCharts = dynamic(
  () => import("@/features/hr/recruitment/components/recruitment-analytics-charts").then((m) => ({ default: m.RecruitmentAnalyticsCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[268px] rounded-xl" />
        <Skeleton className="h-[268px] rounded-xl" />
        <Skeleton className="lg:col-span-2 h-[248px] rounded-xl" />
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
  const { data: stats, isLoading: statsLoading } = useRecruitmentStats();
  const { data: analytics, isLoading: analyticsLoading } =
    useRecruitmentAnalytics();

  const isLoading = statsLoading || analyticsLoading;

  const funnelData = FUNNEL_STAGES.map((stage) => ({
    stage: FUNNEL_LABELS[stage],
    count: stats?.funnel?.[stage] ?? 0,
    avgDays:
      analytics?.funnel?.find((f) => f.stage === stage)?.avgDaysInStage ?? null,
  }));

  const sourceData = (stats?.sources ?? [])
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <PageWrapper
      title="Recruitment Analytics"
      subtitle="Track hiring performance and pipeline health">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {isLoading ? (
          <StatCardGridSkeleton cols={3} />
        ) : (
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
              hint={`${analytics?.hireRate ?? 0}% hire rate`}
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
            <StatCard
              label="Hire Rate"
              value={`${analytics?.hireRate ?? 0}%`}
              hint={`${analytics?.totalHired ?? 0} of ${analytics?.totalCandidates ?? 0} hired`}
              icon={Percent}
              tone="emerald"
            />
          </StatCardGrid>
        )}

        <RecruitmentAnalyticsCharts funnelData={funnelData} sourceData={sourceData} isLoading={isLoading} />
      </div>
    </PageWrapper>
  );
}
