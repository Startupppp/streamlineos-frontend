"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useInterviewerPerformance } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Clock, TrendingUp, UserCheck, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";

interface InterviewerStat {
  interviewerId: string;
  interviewerName: string | null;
  interviewerEmail: string | null;
  totalAssigned: number;
  submitted: number;
  pending: number;
  avgHoursToSubmit: number | null;
  recommendations: Record<string, number>;
}

function getSpeedLabel(hours: number | null): { label: string; color: string } {
  if (hours === null) return { label: "—", color: "text-muted-foreground" };
  if (hours <= 24) return { label: "< 24h", color: "text-emerald-600 dark:text-emerald-400" };
  if (hours <= 48) return { label: `${Math.round(hours)}h`, color: "text-amber-600 dark:text-amber-400" };
  return { label: `${Math.round(hours)}h`, color: "text-destructive" };
}

function SpeedBar({ hours }: { hours: number | null }) {
  if (hours === null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.min((hours / 72) * 100, 100);
  const color = hours <= 24 ? "bg-emerald-500" : hours <= 48 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-xs tabular-nums w-12 text-right", getSpeedLabel(hours).color)}>
        {getSpeedLabel(hours).label}
      </span>
    </div>
  );
}

const INTERVIEWER_PERF_COLUMNS: DataTableColumn<InterviewerStat>[] = [
  {
    key: "interviewer",
    header: "Interviewer",
    cell: (stat) => (
      <div>
        <p className="font-medium text-sm">{stat.interviewerName ?? "—"}</p>
        {stat.interviewerEmail && (
          <p className="text-xs text-muted-foreground">{stat.interviewerEmail}</p>
        )}
      </div>
    ),
    sortable: true,
    sortValue: (s) => s.interviewerName ?? "",
  },
  {
    key: "assigned",
    header: "Assigned",
    headerClassName: "text-center",
    className: "text-center",
    cell: (stat) => <span className="tabular-nums">{stat.totalAssigned}</span>,
    sortable: true,
    sortValue: (s) => s.totalAssigned,
  },
  {
    key: "submitted",
    header: "Submitted",
    headerClassName: "text-center",
    className: "text-center",
    cell: (stat) => (
      <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
        {stat.submitted}
      </span>
    ),
    sortable: true,
    sortValue: (s) => s.submitted,
  },
  {
    key: "pending",
    header: "Pending",
    headerClassName: "text-center",
    className: "text-center",
    cell: (stat) =>
      stat.pending > 0 ? (
        <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700">
          {stat.pending}
        </Badge>
      ) : (
        <span className="text-muted-foreground">0</span>
      ),
    sortable: true,
    sortValue: (s) => s.pending,
  },
  {
    key: "avgSubmitTime",
    header: "Avg Submission Time",
    className: "w-52",
    cell: (stat) => <SpeedBar hours={stat.avgHoursToSubmit} />,
    sortable: true,
    sortValue: (s) => s.avgHoursToSubmit ?? 9999,
  },
  {
    key: "recommendations",
    header: "Recommendations",
    cell: (stat) => {
      const hireCount = stat.recommendations["HIRE"] ?? 0;
      const noHireCount = stat.recommendations["NO_HIRE"] ?? 0;
      const maybeCount = stat.recommendations["MAYBE"] ?? 0;
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {hireCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 text-xs">
              HIRE ×{hireCount}
            </Badge>
          )}
          {maybeCount > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
              MAYBE ×{maybeCount}
            </Badge>
          )}
          {noHireCount > 0 && (
            <Badge variant="outline" className="text-destructive border-destructive/40 text-xs">
              NO_HIRE ×{noHireCount}
            </Badge>
          )}
          {hireCount === 0 && maybeCount === 0 && noHireCount === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      );
    },
  },
];

const PERIOD_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
];

export default function InterviewerPerformancePage() {
  const [days, setDays] = useState(90);
  const { data, isLoading, isError, refetch } = useInterviewerPerformance(days);

  const handlePeriodChange = useCallback((v: string) => setDays(Number(v)), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const stats = data?.stats ?? [];

  const avgSubmitTime =
    stats.length > 0
      ? stats.filter((s) => s.avgHoursToSubmit !== null).reduce((acc, s) => acc + (s.avgHoursToSubmit ?? 0), 0) /
        stats.filter((s) => s.avgHoursToSubmit !== null).length
      : null;

  const totalAssigned = stats.reduce((a, s) => a + s.totalAssigned, 0);
  const totalSubmitted = stats.reduce((a, s) => a + s.submitted, 0);
  const totalPending = stats.reduce((a, s) => a + s.pending, 0);
  const submissionRate = totalAssigned > 0 ? Math.round((totalSubmitted / totalAssigned) * 100) : 0;

  return (
    <PageWrapper
      title="Interviewer Performance"
      subtitle="Track how quickly interviewers submit scorecards after interviews"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/recruitment/interviews">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Interviews
            </Link>
          </Button>
          <Select value={String(days)} onValueChange={handlePeriodChange}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Avg Submit Time"
          value={isLoading ? "—" : avgSubmitTime !== null ? `${Math.round(avgSubmitTime)}h` : "—"}
          icon={Clock}
          color="blue"
          index={0}
        />
        <StatCard
          label="Submission Rate"
          value={isLoading ? "—" : `${submissionRate}%`}
          icon={UserCheck}
          color="green"
          index={1}
        />
        <StatCard
          label="Submitted"
          value={isLoading ? "—" : totalSubmitted}
          icon={TrendingUp}
          color="cyan"
          index={2}
        />
        <StatCard
          label="Pending"
          value={isLoading ? "—" : totalPending}
          icon={AlertCircle}
          color="amber"
          index={3}
        />
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertCircle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm text-muted-foreground">Failed to load performance data.</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>Try again</Button>
        </div>
      ) : (
        <DataTable
          data={stats}
          columns={INTERVIEWER_PERF_COLUMNS}
          getRowKey={(s) => s.interviewerId}
          isLoading={isLoading}
          emptyState={
            <RecruitmentEmptyState
              illustration={<EmptyLeaderboardIllustration />}
              title="No scorecard data for the selected period"
              action={{ label: "View Interviews", href: "/hr/recruitment/interviews" }}
              compact
              className="border-0 bg-transparent shadow-none"
            />
          }
        />
      )}
    </PageWrapper>
  );
}
