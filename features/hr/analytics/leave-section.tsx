"use client";

import { useHrLeaveAnalytics } from "@/lib/api/hooks/hr/leaves-expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PIE_COLORS, SectionSkeleton, EmptyChart, SimpleBar } from "./shared";

interface LeaveSectionProps {
  year: number;
}

export function LeaveSection({ year }: LeaveSectionProps) {
  const { data, isLoading } = useHrLeaveAnalytics(year);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-36 bg-muted rounded animate-pulse" />
        <div className="grid md:grid-cols-2 gap-3">
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={4} />
          <SectionSkeleton rows={4} />
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

  const leaveTypeData = data.byLeaveType.map((t) => ({
    name: t.typeName,
    value: t.count,
  }));

  const avgDaysData = data.avgDaysByDepartment
    .sort((a, b) => b.avgDays - a.avgDays)
    .map((d) => ({
      label: d.department,
      value: d.avgDays,
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

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Leave Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {leaveTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={leaveTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={36}
                    paddingAngle={2}
                  >
                    {leaveTypeData.map((_, idx) => (
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
              <EmptyChart label="No leave type data" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Avg Leave Days by Department</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {avgDaysData.length > 0 ? (
              <SimpleBar data={avgDaysData} />
            ) : (
              <EmptyChart label="No utilization data" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
