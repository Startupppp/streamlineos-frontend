"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import dynamic from "next/dynamic";

const ScorecardCharts = dynamic(
  () => import("@/features/hr/recruitment/components/scorecard-charts").then((m) => ({ default: m.ScorecardCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[268px] rounded-xl" />
        <Skeleton className="h-[268px] rounded-xl" />
      </div>
    ),
  },
);

interface InterviewerStat {
  interviewerId: string;
  name: string | null;
  email: string;
  totalScorecards: number;
  avgRating: number;
  recommendations: Record<string, number>;
  hireRate: number;
}

interface ScorecardAnalytics {
  interviewerStats: InterviewerStat[];
  orgAvgRating: number;
  totalScorecards: number;
  scoreDistribution: { range: string; count: number }[];
  period: { days: number; since: string };
}

const PERIOD_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 180 days" },
  { value: "365", label: "Last year" },
];

function ratingColor(avg: number, orgAvg: number): string {
  if (avg < orgAvg - 1.5) return "text-destructive";
  if (avg > orgAvg + 1.5) return "text-green-600";
  return "text-foreground";
}

function initials(name: string | null, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export default function ScorecardAnalyticsPage() {
  const [days, setDays] = useState("90");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.hr.scorecardAnalytics({ days }),
    queryFn: () => apiClient.get<ScorecardAnalytics>(`/hr/recruitment/scorecard-analytics?days=${days}`),
    staleTime: 5 * 60_000,
  });

  const handleDaysChange = useCallback((v: string) => setDays(v), []);

  if (isLoading) {
    return (
      <PageWrapper title="Scorecard Analytics" subtitle="Interviewer performance and scoring patterns">
        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  const stats = data?.interviewerStats ?? [];
  const dist = data?.scoreDistribution ?? [];

  return (
    <PageWrapper
      title="Scorecard Analytics"
      subtitle="Interviewer bias detection and scoring patterns"
      filters={
        <Select value={days} onValueChange={handleDaysChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Total Scorecards</p>
            <p className="text-2xl font-bold mt-1">{data?.totalScorecards ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Org Avg Rating</p>
            <p className="text-2xl font-bold mt-1">{data?.orgAvgRating ?? 0} <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Active Interviewers</p>
            <p className="text-2xl font-bold mt-1">{stats.length}</p>
          </CardContent>
        </Card>
      </div>

      {stats.length === 0 ? (
        <RecruitmentEmptyState
          illustration={<EmptyLeaderboardIllustration />}
          title="No scorecard data"
          description="Scorecard analytics will appear once interviewers submit scorecards for completed interviews."
        />
      ) : (
        <div className="space-y-4">
          <ScorecardCharts stats={stats} dist={dist} orgAvgRating={data?.orgAvgRating} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Interviewer Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.map((s) => (
                  <div key={s.interviewerId} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <Avatar className="w-8 shrink-0">
                      <AvatarFallback className="text-xs">{initials(s.name, s.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name ?? s.email}</p>
                      <p className="text-xs text-muted-foreground">{s.totalScorecards} scorecards</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className={`text-sm font-semibold ${ratingColor(s.avgRating, data?.orgAvgRating ?? 5)}`}>
                        {s.avgRating} / 10
                      </p>
                      <p className="text-xs text-muted-foreground">{s.hireRate}% hire rate</p>
                    </div>
                    <div className="hidden sm:flex gap-1 shrink-0">
                      {Object.entries(s.recommendations).map(([rec, cnt]) => (
                        <Badge key={rec} variant="secondary" className="text-[9px] px-1.5">
                          {rec.replace("_", " ")}: {cnt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
