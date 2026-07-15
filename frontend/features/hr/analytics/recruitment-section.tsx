"use client";

import { useRecruitmentStats } from "@/hooks/api/hr/recruitment";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Briefcase, Users, TrendingUp, Clock } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import {
  AnalyticsChartCard,
  AnalyticsSectionHeader,
  EmptyChart,
  PIE_COLORS,
  SectionSkeleton,
  SimpleBar,
  chartTooltipStyle,
} from "./shared";

interface RecruitmentSectionProps {
  isLoading: boolean;
}

export function RecruitmentSection({ isLoading }: RecruitmentSectionProps) {
  const { data: stats } = useRecruitmentStats();

  if (isLoading || !stats) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
        </div>
      </section>
    );
  }

  const totalSent = stats.funnel["OFFER_SENT"] ?? 0;
  const totalHired = stats.funnel["HIRED"] ?? 0;
  const offerAcceptanceRate =
    totalSent > 0 ? Math.round((totalHired / totalSent) * 100) : 0;

  const funnelData = Object.entries(stats.funnel)
    .filter(([, v]) => v > 0)
    .map(([stage, count]) => ({ label: stage.replace(/_/g, " "), value: count }));

  return (
    <section className="space-y-4">
      <AnalyticsSectionHeader
        title="Recruitment Analytics"
        description="Pipeline volume, sources, and hiring efficiency."
      />
      <StatCardGrid cols={4}>
        <StatCard
          label="Open Positions"
          value={stats.openJobs}
          icon={Briefcase}
          color="amber"
          index={0}
        />
        <StatCard
          label="Total Candidates"
          value={stats.totalCandidates}
          icon={Users}
          color="blue"
          index={1}
        />
        <StatCard
          label="Offer Acceptance"
          value={`${offerAcceptanceRate}%`}
          icon={TrendingUp}
          color="green"
          index={2}
        />
        <StatCard
          label="Avg Time-to-Hire"
          value={`${stats.avgTimeToHireDays}d`}
          icon={Clock}
          color="violet"
          index={3}
        />
      </StatCardGrid>

      <div className="grid gap-3 md:grid-cols-2">
        <AnalyticsChartCard title="Candidate Pipeline">
          {funnelData.length > 0 ? (
            <SimpleBar data={funnelData} />
          ) : (
            <EmptyChart label="No pipeline data" />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Candidate Sources">
          {stats.sources.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.sources.map((s) => ({ name: s.source, value: s.count }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  innerRadius={44}
                  paddingAngle={3}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {stats.sources.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No source data" />
          )}
        </AnalyticsChartCard>
      </div>
    </section>
  );
}
