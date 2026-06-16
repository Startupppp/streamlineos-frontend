"use client";

import { useHrAttritionAnalytics } from "@/lib/api/hooks/hr/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Users, UserMinus, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { SectionSkeleton, EmptyChart } from "./shared";

interface AttritionSectionProps {
  isLoading: boolean;
}

export function AttritionSection({ isLoading }: AttritionSectionProps) {
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
