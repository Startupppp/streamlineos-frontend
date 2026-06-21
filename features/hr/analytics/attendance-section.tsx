"use client";

import { useHrAttendanceAnalytics } from "@/lib/api/hooks/hr/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Clock, Building2, CalendarCheck } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { SectionSkeleton, EmptyChart, SimpleBar } from "./shared";

interface AttendanceSectionProps {
  year: number;
  month: number;
}

export function AttendanceSection({ year, month }: AttendanceSectionProps) {
  const { data, isLoading } = useHrAttendanceAnalytics(year, month);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
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
