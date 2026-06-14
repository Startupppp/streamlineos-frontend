"use client";

import { useMemo } from "react";
import { useHrAnalytics } from "@/lib/api/hooks/hr/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { Users, TrendingUp, UserMinus, UserPlus } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { SectionSkeleton } from "./shared";
import { EmptyChart } from "./shared";
import { SimpleBar } from "./shared";

interface WorkforceSectionProps {
  data: ReturnType<typeof useHrAnalytics>["data"];
  isLoading: boolean;
}

export function WorkforceSection({ data, isLoading }: WorkforceSectionProps) {
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

        <Card className="md:col-span-2">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Joining vs Exits Trend (YTD)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {data.joiningExitsTrend.some((m) => m.joins > 0 || m.exits > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={data.joiningExitsTrend}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 9 }}
                    stroke="hsl(var(--muted-foreground))"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="joins"
                    name="New Joins"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="exits"
                    name="Exits"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No joining or exit data for this year" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
