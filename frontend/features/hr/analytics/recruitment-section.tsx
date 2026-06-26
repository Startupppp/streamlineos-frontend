"use client";

import { useRecruitmentStats } from "@/lib/api/hooks/hr/recruitment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Briefcase, Users, TrendingUp, Clock } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { PIE_COLORS, SectionSkeleton, EmptyChart, SimpleBar } from "./shared";

interface RecruitmentSectionProps {
  isLoading: boolean;
}

export function RecruitmentSection({ isLoading }: RecruitmentSectionProps) {
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
