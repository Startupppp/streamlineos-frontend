"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,@/hooks/api/hr/recruitment
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRecruitmentStats,
  useRecruitmentAnalytics,
} from "@/hooks/hooks/hr/recruitment";

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

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
}

function KpiCard({ label, value, sub, icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            )}
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

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
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Total Jobs"
                value={stats?.totalJobs ?? 0}
                sub={`${stats?.openJobs ?? 0} open`}
                icon={
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  </svg>
                }
              />
              <KpiCard
                label="Total Candidates"
                value={stats?.totalCandidates ?? 0}
                sub={`${stats?.newCandidates ?? 0} new`}
                icon={
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                }
              />
              <KpiCard
                label="Hired This Month"
                value={stats?.hiredThisMonth ?? 0}
                sub={`${analytics?.hireRate ?? 0}% hire rate`}
                icon={
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                }
              />
              <KpiCard
                label="Upcoming Interviews"
                value={stats?.upcomingInterviews ?? 0}
                icon={
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                }
              />
              <KpiCard
                label="Avg. Days to Hire"
                value={stats?.avgTimeToHireDays ?? 0}
                sub="from application to hired"
                icon={
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
              />
              <KpiCard
                label="Hire Rate"
                value={`${analytics?.hireRate ?? 0}%`}
                sub={`${analytics?.totalHired ?? 0} of ${analytics?.totalCandidates ?? 0} hired`}
                icon={
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                }
              />
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Candidate Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : sourceData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                  No source data yet
                </div>
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

        <Card>
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
