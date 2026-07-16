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

const SOURCE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

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
      subtitle="Track hiring performance and pipeline health"
    >
      <div className="space-y-6">
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Hiring Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={funnelData}
                    margin={{ top: 4, right: 8, bottom: 4, left: -10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(value) => [value, "Candidates"]}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Candidate Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : sourceData.length === 0 ? (
                <ChartEmptyState message="No source data yet" height={220} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({
                        name,
                        percent,
                      }: {
                        name?: string;
                        percent?: number;
                      }) =>
                        `${name ?? ""} ${Math.round((percent ?? 0) * 100)}%`
                      }
                      labelLine={false}
                    >
                      {sourceData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={SOURCE_COLORS[i % SOURCE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Avg. Days in Each Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={funnelData.filter((f) => f.avgDays !== null)}
                  margin={{ top: 4, right: 8, bottom: 4, left: -10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="d" />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value) => [`${value}d`, "Avg. Days"]}
                  />
                  <Bar
                    dataKey="avgDays"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
