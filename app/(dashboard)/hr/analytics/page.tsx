"use client";

import { useMemo, useState } from "react";
import {
  useHrAnalytics,
  useHrAttendanceAnalytics,
  useHrAttritionAnalytics,
} from "@/lib/api/hooks/hr/analytics";
import { useRecruitmentStats } from "@/lib/api/hooks/hr/recruitment";
import { useHrLeaveAnalytics } from "@/lib/api/hooks/hr/leaves-expenses";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Users,
  UserPlus,
  TrendingDown,
  TrendingUp,
  CalendarCheck,
  Clock,
  Building2,
  Briefcase,
  UserMinus,
  Activity,
} from "lucide-react";

type DateRange = "month" | "quarter" | "year";

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;

const PIE_COLORS = [
  "hsl(var(--chart-1, 221 83% 53%))",
  "hsl(var(--chart-2, 142 71% 45%))",
  "hsl(var(--chart-3, 262 80% 50%))",
  "hsl(var(--chart-4, 32 95% 50%))",
  "hsl(var(--chart-5, 0 72% 51%))",
  "hsl(var(--chart-6, 189 94% 43%))",
];

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <EmptyLeaderboardIllustration className="h-28 w-28 opacity-80" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SimpleBar({
  data,
}: {
  data: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-28 truncate shrink-0">
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${item.color ?? "bg-primary"}`}
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums w-8 text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function DateRangeSelector({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  function handleChange(v: string) {
    onChange(v as DateRange);
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="month">This Month</SelectItem>
        <SelectItem value="quarter">This Quarter</SelectItem>
        <SelectItem value="year">This Year</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ExecutiveKPIs({
  totalEmployees,
  attritionRate,
  openPositions,
  attendanceLogs,
  isLoading,
}: {
  totalEmployees: number;
  attritionRate: string;
  openPositions: number;
  attendanceLogs: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Total Employees"
        value={totalEmployees}
        icon={Users}
        color="blue"
        index={0}
      />
      <StatCard
        label="Attrition Rate"
        value={`${attritionRate}%`}
        icon={TrendingDown}
        color="red"
        index={1}
      />
      <StatCard
        label="Open Positions"
        value={openPositions}
        icon={Briefcase}
        color="amber"
        index={2}
      />
      <StatCard
        label="Attendance Logs (Mo)"
        value={attendanceLogs}
        icon={Activity}
        color="green"
        index={3}
      />
    </div>
  );
}

function WorkforceSection({
  data,
  isLoading,
}: {
  data: ReturnType<typeof useHrAnalytics>["data"];
  isLoading: boolean;
}) {
  const activeRate = useMemo(() => {
    if (!data) return 0;
    return data.headcount.total > 0
      ? Math.round((data.headcount.active / data.headcount.total) * 100)
      : 0;
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <SectionSkeleton rows={5} />
        <SectionSkeleton rows={4} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Workforce Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Headcount"
          value={data.headcount.total}
          icon={Users}
          color="blue"
          index={0}
        />
        <StatCard
          label="Active"
          value={data.headcount.active}
          icon={TrendingUp}
          hint={`${activeRate}% active rate`}
          color="green"
          index={1}
        />
        <StatCard
          label="Inactive"
          value={data.headcount.total - data.headcount.active}
          icon={UserMinus}
          color="red"
          index={2}
        />
        <StatCard
          label="New Joins (Month)"
          value={data.headcount.newThisMonth}
          icon={UserPlus}
          color="violet"
          index={3}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Headcount by Department</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {data.departments.length > 0 ? (
              <SimpleBar
                data={data.departments.map((d) => ({
                  label: d.name,
                  value: d.count,
                }))}
              />
            ) : (
              <EmptyChart label="No department data" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Gender Diversity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {data.gender.length > 0 ? (
              <div className="space-y-3">
                {data.gender.map((g) => {
                  const total = data.headcount.active || 1;
                  const pct = Math.round((g.count / total) * 100);
                  return (
                    <div key={g.gender} className="flex items-center gap-3">
                      <span className="text-xs w-16 shrink-0">{g.gender}</span>
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs font-medium tabular-nums w-16 text-right">
                        {g.count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyChart label="No gender data" />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Role Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {data.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.roles.map((r) => (
                  <Badge key={r.role} variant="secondary" className="text-xs gap-1">
                    {r.role}
                    <span className="font-bold">{r.count}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyChart label="No role data" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RecruitmentSection({
  isLoading,
}: {
  isLoading: boolean;
}) {
  const { data: stats } = useRecruitmentStats();

  if (isLoading || !stats) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
        </div>
      </div>
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
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Recruitment Analytics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Candidate Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {funnelData.length > 0 ? (
              <SimpleBar data={funnelData} />
            ) : (
              <EmptyChart label="No pipeline data" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Candidate Sources</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {stats.sources.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={stats.sources.map((s) => ({ name: s.source, value: s.count }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={36}
                    paddingAngle={2}
                  >
                    {stats.sources.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No source data" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AttendanceSection({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const { data, isLoading } = useHrAttendanceAnalytics(year, month);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid md:grid-cols-2 gap-3">
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={6} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const dailyChartData = data.daily.map((d) => ({
    date: d.date.slice(8),
    count: d.count,
  }));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Attendance Analytics</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Total Logs (Month)"
          value={data.totalAttendanceLogs}
          icon={Clock}
          color="blue"
          index={0}
        />
        <StatCard
          label="Departments Tracked"
          value={data.byDepartment.length}
          icon={Building2}
          color="green"
          index={1}
        />
        <StatCard
          label="Active Days"
          value={data.daily.length}
          icon={CalendarCheck}
          color="violet"
          index={2}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Department-wise Attendance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {data.byDepartment.length > 0 ? (
              <SimpleBar
                data={data.byDepartment.map((d) => ({
                  label: d.department,
                  value: d.count,
                }))}
              />
            ) : (
              <EmptyChart label="No department attendance data" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Daily Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={dailyChartData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9 }}
                    interval={4}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No daily attendance data" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LeaveSection({ year }: { year: number }) {
  const { data, isLoading } = useHrLeaveAnalytics(year);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <div className="grid md:grid-cols-2 gap-3">
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const monthlyData = data.monthlyTrend.map((m) => ({
    month: m.month,
    count: m.count,
  }));

  const deptData = data.byDepartment.map((d) => ({
    dept: d.department.length > 8 ? `${d.department.slice(0, 8)}…` : d.department,
    approved: d.approved,
    pending: d.pending,
    rejected: d.rejected,
  }));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Leave Analytics</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Department-wise Leave Trends</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={deptData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="dept"
                    tick={{ fontSize: 9 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="approved" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="pending" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="rejected" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No department leave data" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Monthly Leave Trend (Approved)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No monthly leave data" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AttritionSection({ isLoading }: { isLoading: boolean }) {
  const { data } = useHrAttritionAnalytics();

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
        </div>
      </div>
    );
  }

  const monthlyData = data.byMonth.map((m) => ({
    month: m.month.slice(5),
    resignations: m.count,
  }));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Attrition & Retention</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Total Employees"
          value={data.totalEmployees}
          icon={Users}
          color="blue"
          index={0}
        />
        <StatCard
          label="Resignations (YTD)"
          value={data.resignedThisYear}
          icon={UserMinus}
          color="red"
          index={1}
        />
        <StatCard
          label="Attrition Rate"
          value={`${data.attritionRatePercent}%`}
          icon={TrendingDown}
          color="amber"
          index={2}
        />
      </div>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Resignation Trend by Month (YTD)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={monthlyData}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                  }}
                />
                <Bar
                  dataKey="resignations"
                  fill="#ef4444"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No resignation data for this year" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsContent() {
  const [dateRange, setDateRange] = useState<DateRange>("month");

  const analyticsYear = useMemo(() => {
    return CURRENT_YEAR;
  }, []);

  const analyticsMonth = useMemo(() => {
    if (dateRange === "month") return CURRENT_MONTH;
    if (dateRange === "quarter") return Math.ceil(CURRENT_MONTH / 3) * 3 - 2;
    return 1;
  }, [dateRange]);

  const { data, isLoading: isAnalyticsLoading } = useHrAnalytics();
  const { data: recruitmentStats, isLoading: isRecruitmentLoading } =
    useRecruitmentStats();
  const { data: attritionData, isLoading: isAttritionLoading } =
    useHrAttritionAnalytics();

  const isTopLoading =
    isAnalyticsLoading || isRecruitmentLoading || isAttritionLoading;

  const totalEmployees = data?.headcount.active ?? 0;
  const attritionRate = attritionData?.attritionRatePercent ?? "0.0";
  const openPositions = recruitmentStats?.openJobs ?? 0;
  const attendanceLogs = data?.attendance.totalLogsThisMonth ?? 0;

  return (
    <PageWrapper
      title="HR Analytics"
      subtitle="Workforce insights and metrics"
      actions={
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      }
    >
      <div className="space-y-6">
        <ExecutiveKPIs
          totalEmployees={totalEmployees}
          attritionRate={attritionRate}
          openPositions={openPositions}
          attendanceLogs={attendanceLogs}
          isLoading={isTopLoading}
        />

        <WorkforceSection data={data} isLoading={isAnalyticsLoading} />

        <RecruitmentSection isLoading={isRecruitmentLoading} />

        <AttendanceSection year={analyticsYear} month={analyticsMonth} />

        <LeaveSection year={analyticsYear} />

        <AttritionSection isLoading={isAttritionLoading} />
      </div>
    </PageWrapper>
  );
}

export default function HrAnalyticsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <AnalyticsContent />
    </DashboardGate>
  );
}
