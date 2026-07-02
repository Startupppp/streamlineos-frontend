"use client";

import { useCallback } from "react";
import { useRecruitmentStats, useJobPostings, useInterviews } from "@/hooks/api/hr";
import { useRecruitmentAnalytics } from "@/hooks/api/hr/recruitment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Users,
  Calendar,
  UserCheck,
  ArrowRight,
  Clock,
  Target,
  ChevronRight,
  Video,
  Phone,
  MapPin,
  Activity,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";

const SOURCE_COLORS = [
  "#0369A1",
  "#0EA5E9",
  "#22C55E",
  "#F59E0B",
  "#8B5CF6",
  "#94a3b8",
];

const FUNNEL_STAGES = [
  {
    key: "NEW",
    label: "New",
    bar: "bg-slate-400 dark:bg-slate-500",
    pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  {
    key: "SCREENING",
    label: "Screening",
    bar: "bg-sky-400",
    pill: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
  {
    key: "INTERVIEW",
    label: "Interview",
    bar: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    key: "OFFER",
    label: "Offer",
    bar: "bg-violet-500",
    pill: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  },
  {
    key: "HIRED",
    label: "Hired",
    bar: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
];

const INTERVIEW_TYPE_ICON: Record<string, typeof Video> = {
  VIDEO: Video,
  PHONE: Phone,
  ONSITE: MapPin,
  TECHNICAL: Target,
  HR: Users,
  FINAL: Target,
};

const NAV_LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/hr/recruitment", label: "Overview", exact: true },
  { href: "/hr/recruitment/candidates", label: "Candidates" },
  { href: "/hr/recruitment/pipeline", label: "Pipeline" },
  { href: "/hr/recruitment/jobs", label: "Jobs" },
  { href: "/hr/recruitment/interviews", label: "Interviews" },
  { href: "/hr/recruitment/question-bank", label: "Question Bank" },
];

function StatCardSkeleton() {
  return (
    <div className="bg-muted/40 rounded-lg p-3 text-center space-y-2">
      <Skeleton className="h-4 w-4 rounded mx-auto" />
      <Skeleton className="h-6 w-12 mx-auto" />
      <Skeleton className="h-3 w-20 mx-auto" />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ElementType;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "bg-muted/40 rounded-lg p-3 text-center transition-colors duration-150",
        href && "hover:bg-muted/60 cursor-pointer",
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
      <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function RecruitmentDashboardPage() {
  const pathname = usePathname();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useRecruitmentStats();
  const { data: recentJobs, isLoading: jobsLoading } = useJobPostings({ status: "OPEN" });
  const { data: upcomingInterviews, isLoading: interviewsLoading } = useInterviews({
    upcoming: true,
  });
  const { data: analytics } = useRecruitmentAnalytics();

  const isLoading = statsLoading || jobsLoading || interviewsLoading;
  const handleRetryStats = useCallback(() => {
    void refetchStats();
  }, [refetchStats]);

  const funnelMax = stats?.funnel ? Math.max(...Object.values(stats.funnel), 1) : 1;

  return (
    <PageWrapper
      title="Recruitment"
      subtitle="Track and manage your hiring pipeline"
      filters={
        <div className="flex items-center gap-0.5 flex-wrap">
          {NAV_LINKS.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      }
    >
      <div className="space-y-5">
        {statsError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl border border-border bg-card text-center">
            <p className="text-sm font-semibold text-foreground">Failed to load recruitment data</p>
            <p className="text-xs text-muted-foreground">An error occurred while fetching data.</p>
            <Button size="sm" variant="outline" onClick={handleRetryStats}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
              ) : (
                <>
                  <StatCard
                    label="Open Positions"
                    value={stats?.openJobs ?? 0}
                    sub={`${stats?.totalJobs ?? 0} total jobs`}
                    icon={Briefcase}
                    href="/hr/recruitment/jobs"
                  />
                  <StatCard
                    label="Total Candidates"
                    value={stats?.totalCandidates ?? 0}
                    sub={`+${stats?.newCandidates ?? 0} this week`}
                    icon={Users}
                    href="/hr/recruitment/candidates"
                  />
                  <StatCard
                    label="Upcoming Interviews"
                    value={stats?.upcomingInterviews ?? 0}
                    sub="scheduled"
                    icon={Calendar}
                    href="/hr/recruitment/interviews"
                  />
                  <StatCard
                    label="Hired This Month"
                    value={stats?.hiredThisMonth ?? 0}
                    sub={`${stats?.avgTimeToHireDays ?? 0}d avg to hire`}
                    icon={UserCheck}
                  />
                </>
              )}
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Hiring Funnel
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Conversion across pipeline stages
                    </p>
                  </div>
                  {analytics && (
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <p className="text-muted-foreground">Hire rate</p>
                        <p className="font-bold text-emerald-600 text-sm">{analytics.hireRate}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-bold text-foreground text-sm">
                          {analytics.totalCandidates}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {FUNNEL_STAGES.map((stage, idx) => {
                        const cnt = stats?.funnel?.[stage.key] ?? 0;
                        const prevCnt =
                          idx > 0 ? (stats?.funnel?.[FUNNEL_STAGES[idx - 1]!.key] ?? 0) : cnt;
                        const conversionPct =
                          prevCnt > 0 && idx > 0 ? Math.round((cnt / prevCnt) * 100) : null;
                        const barWidth =
                          funnelMax > 0
                            ? Math.max((cnt / funnelMax) * 100, cnt > 0 ? 3 : 0)
                            : 0;

                        return (
                          <div key={stage.key} className="flex items-center gap-3 group">
                            <div className="w-[72px] shrink-0 text-right">
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-2 py-1 rounded-md",
                                  stage.pill,
                                )}
                              >
                                {stage.label}
                              </span>
                            </div>
                            <div className="flex-1 h-8 rounded-lg bg-muted/50 overflow-hidden relative">
                              <div
                                className={cn(
                                  "h-full rounded-lg transition-all duration-700 flex items-center px-3",
                                  stage.bar,
                                )}
                                style={{ width: `${barWidth}%` }}
                              >
                                {barWidth > 10 && (
                                  <span className="text-[11px] font-bold text-white">{cnt}</span>
                                )}
                              </div>
                              {barWidth <= 10 && (
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-foreground">
                                  {cnt}
                                </span>
                              )}
                            </div>
                            <div className="w-12 shrink-0 text-right">
                              {conversionPct !== null && (
                                <span
                                  className={cn(
                                    "text-[11px] font-semibold tabular-nums",
                                    conversionPct >= 50
                                      ? "text-emerald-600"
                                      : conversionPct >= 25
                                        ? "text-muted-foreground"
                                        : "text-rose-500",
                                  )}
                                >
                                  {conversionPct}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-3">
                        <div className="w-[72px] shrink-0 text-right">
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                            Rejected
                          </span>
                        </div>
                        <div className="flex-1 h-8 rounded-lg bg-muted/50 overflow-hidden relative">
                          <div
                            className="h-full rounded-lg bg-rose-400 dark:bg-rose-500 transition-all duration-700 flex items-center px-3"
                            style={{
                              width: `${funnelMax > 0 ? Math.max(((stats?.funnel?.REJECTED ?? 0) / funnelMax) * 100, 0) : 0}%`,
                            }}
                          >
                            {funnelMax > 0 &&
                              ((stats?.funnel?.REJECTED ?? 0) / funnelMax) * 100 > 10 && (
                                <span className="text-[11px] font-bold text-white">
                                  {stats?.funnel?.REJECTED ?? 0}
                                </span>
                              )}
                          </div>
                        </div>
                        <div className="w-12 shrink-0" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/60">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Candidate Sources
                    </h2>
                  </div>
                  <div className="px-5 py-4">
                    {isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-20" />
                              <Skeleton className="h-3 w-12" />
                            </div>
                            <Skeleton className="h-2 w-full rounded-full" />
                          </div>
                        ))}
                      </div>
                    ) : !stats?.sources?.length ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No source data yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {stats.sources.slice(0, 6).map((s, i) => {
                          const total = stats.sources.reduce((sum, x) => sum + x.count, 0);
                          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                          return (
                            <div key={s.source} className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-medium text-foreground">{s.source}</span>
                                <span className="text-muted-foreground tabular-nums">
                                  {s.count} · {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length],
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                  <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {stats?.avgTimeToHireDays ?? "—"}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">avg days to hire</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Open Positions</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {recentJobs?.length ?? 0} active roles
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 h-7 text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href="/hr/recruitment/jobs">
                      View all <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
                <div className="divide-y divide-border/50">
                  {jobsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-36" />
                          <Skeleton className="h-2.5 w-24" />
                        </div>
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </div>
                    ))
                  ) : !recentJobs?.length ? (
                    <div className="py-10 text-center">
                      <EmptyPersonIllustration className="mx-auto mb-3 h-20 w-20 opacity-80" />
                      <p className="text-xs text-muted-foreground">No open positions yet</p>
                    </div>
                  ) : (
                    recentJobs.slice(0, 5).map((job) => (
                      <Link
                        key={job.id}
                        href="/hr/recruitment/jobs"
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors duration-150 cursor-pointer group"
                      >
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Briefcase className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-150">
                            {job.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {job.location ?? "Remote"} · {job.type?.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {job.openings} open
                          </Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Upcoming Interviews</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {upcomingInterviews?.length ?? 0} scheduled
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 h-7 text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href="/hr/recruitment/interviews">
                      View all <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
                <div className="divide-y divide-border/50">
                  {interviewsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-2.5 w-20" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    ))
                  ) : !upcomingInterviews?.length ? (
                    <div className="py-10 text-center">
                      <p className="text-xs text-muted-foreground">No upcoming interviews</p>
                    </div>
                  ) : (
                    upcomingInterviews.slice(0, 5).map((interview) => {
                      const TypeIcon =
                        (interview.type ? INTERVIEW_TYPE_ICON[interview.type] : null) ?? Calendar;
                      const initials =
                        `${interview.candidate?.firstName?.[0] ?? ""}${interview.candidate?.lastName?.[0] ?? ""}`.toUpperCase();
                      return (
                        <div
                          key={interview.id}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors duration-150"
                        >
                          <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center shrink-0 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {interview.candidate?.firstName} {interview.candidate?.lastName}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                              <TypeIcon className="h-3 w-3 shrink-0" />
                              <span>{interview.type}</span>
                              <span>·</span>
                              <span>
                                {formatDistanceToNow(new Date(interview.scheduledAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                              interview.result === "PENDING"
                                ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300",
                            )}
                          >
                            {interview.result}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
