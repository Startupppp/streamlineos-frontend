"use client";

import { useRecruitmentStats, useJobPostings, useInterviews } from "@/lib/api/hooks/hr";
import { useRecruitmentAnalytics } from "@/lib/api/hooks/hr/recruitment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, Users, Calendar, UserCheck, ArrowRight,
  TrendingUp, Clock, Target, ChevronRight, Video, Phone, MapPin,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { EmptyPersonIllustration } from "@/components/illustrations";

const PIE_COLORS = [
  "#0369A1", "#0EA5E9", "#22C55E", "#8B5CF6", "#F59E0B", "#EF4444",
];

const FUNNEL_STAGES = [
  { key: "NEW", label: "New", color: "from-slate-500 to-slate-400", light: "bg-slate-100 text-slate-700" },
  { key: "SCREENING", label: "Screening", color: "from-blue-600 to-blue-400", light: "bg-blue-100 text-blue-700" },
  { key: "INTERVIEW", label: "Interview", color: "from-amber-500 to-amber-400", light: "bg-amber-100 text-amber-700" },
  { key: "OFFER", label: "Offer", color: "from-purple-600 to-purple-400", light: "bg-purple-100 text-purple-700" },
  { key: "HIRED", label: "Hired", color: "from-emerald-600 to-emerald-400", light: "bg-emerald-100 text-emerald-700" },
];

const INTERVIEW_TYPE_ICON: Record<string, typeof Video> = {
  VIDEO: Video,
  PHONE: Phone,
  ONSITE: MapPin,
  TECHNICAL: Target,
  HR: Users,
  FINAL: Target,
};

const NAV_LINKS = [
  { href: "/hr/recruitment/candidates", label: "Candidates", count: null },
  { href: "/hr/recruitment/pipeline", label: "Pipeline" },
  { href: "/hr/recruitment/jobs", label: "Jobs" },
  { href: "/hr/recruitment/interviews", label: "Interviews" },
  { href: "/hr/recruitment/question-bank", label: "Question Bank" },
] as const;

function HeroSkeleton() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0369A1] to-[#0EA5E9] p-6 shadow-xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/10 p-4 space-y-2">
            <Skeleton className="h-3 w-20 bg-white/20" />
            <Skeleton className="h-8 w-12 bg-white/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecruitmentDashboardPage() {
  const pathname = usePathname();
  const { data: stats, isLoading: statsLoading } = useRecruitmentStats();
  const { data: recentJobs, isLoading: jobsLoading } = useJobPostings({ status: "OPEN" });
  const { data: upcomingInterviews, isLoading: interviewsLoading } = useInterviews({ upcoming: true });
  const { data: analytics } = useRecruitmentAnalytics();

  const isLoading = statsLoading || jobsLoading || interviewsLoading;

  const funnelMax = stats?.funnel
    ? Math.max(...Object.values(stats.funnel as Record<string, number>), 1)
    : 1;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Recruitment</h1>
        <p className="text-sm text-muted-foreground">Hire the best talent for your team</p>
      </div>

      <div className="flex items-center gap-1 flex-wrap border-b border-border pb-1">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-all duration-150 cursor-pointer ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {isLoading ? (
        <HeroSkeleton />
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0369A1] via-[#0284C7] to-[#0EA5E9] p-6 shadow-xl">
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)",
            }}
          />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Open Positions", value: stats?.openJobs ?? 0, icon: Briefcase, sub: `${stats?.totalJobs ?? 0} total jobs` },
              { label: "Total Candidates", value: stats?.totalCandidates ?? 0, icon: Users, sub: `+${stats?.newCandidates ?? 0} this week` },
              { label: "Upcoming Interviews", value: stats?.upcomingInterviews ?? 0, icon: Calendar, sub: "scheduled" },
              { label: "Hired This Month", value: stats?.hiredThisMonth ?? 0, icon: UserCheck, sub: `${stats?.avgTimeToHireDays ?? 0}d avg to hire` },
            ].map(({ label, value, icon: Icon, sub }) => (
              <div key={label} className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 p-4 hover:bg-white/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-blue-100">{label}</p>
                  <div className="h-7 w-7 rounded-lg bg-white/15 flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
                <p className="text-[11px] text-blue-200 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Hiring Funnel</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Conversion across pipeline stages</p>
            </div>
            {analytics && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  Hire rate <span className="font-semibold text-emerald-600">{analytics.hireRate}%</span>
                </span>
                <span className="text-muted-foreground">
                  Total <span className="font-semibold text-foreground">{analytics.totalCandidates}</span>
                </span>
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {FUNNEL_STAGES.map((stage, idx) => {
                const cnt = (stats?.funnel as Record<string, number>)?.[stage.key] ?? 0;
                const prevCnt = idx > 0
                  ? ((stats?.funnel as Record<string, number>)?.[FUNNEL_STAGES[idx - 1].key] ?? 0)
                  : cnt;
                const conversionPct = prevCnt > 0 && idx > 0 ? Math.round((cnt / prevCnt) * 100) : null;
                const barWidth = funnelMax > 0 ? Math.max((cnt / funnelMax) * 100, cnt > 0 ? 4 : 0) : 0;

                return (
                  <div key={stage.key} className="group flex items-center gap-3">
                    <div className="w-20 shrink-0 text-right">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stage.light}`}>
                        {stage.label}
                      </span>
                    </div>
                    <div className="flex-1 h-9 bg-muted/40 rounded-lg overflow-hidden relative">
                      <div
                        className={`h-full bg-gradient-to-r ${stage.color} rounded-lg transition-all duration-700 flex items-center px-3`}
                        style={{ width: `${barWidth}%` }}
                      >
                        {barWidth > 12 && (
                          <span className="text-[11px] font-bold text-white">{cnt}</span>
                        )}
                      </div>
                      {barWidth <= 12 && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-foreground">{cnt}</span>
                      )}
                    </div>
                    {conversionPct !== null && (
                      <div className="w-14 shrink-0 text-right">
                        <span className={`text-[11px] font-medium ${conversionPct >= 50 ? "text-emerald-600" : conversionPct >= 25 ? "text-amber-600" : "text-rose-600"}`}>
                          {conversionPct}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="group flex items-center gap-3">
                <div className="w-20 shrink-0 text-right">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    Rejected
                  </span>
                </div>
                <div className="flex-1 h-9 bg-muted/40 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-lg transition-all duration-700 flex items-center px-3"
                    style={{ width: `${funnelMax > 0 ? Math.max((((stats?.funnel as Record<string, number>)?.REJECTED ?? 0) / funnelMax) * 100, 0) : 0}%` }}
                  >
                    {funnelMax > 0 && (((stats?.funnel as Record<string, number>)?.REJECTED ?? 0) / funnelMax) * 100 > 12 && (
                      <span className="text-[11px] font-bold text-white">{(stats?.funnel as Record<string, number>)?.REJECTED ?? 0}</span>
                    )}
                  </div>
                </div>
                <div className="w-14 shrink-0" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4">Candidate Sources</h2>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full rounded-full" />)}
              </div>
            ) : !stats?.sources?.length ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No source data yet</p>
            ) : (
              <div className="space-y-2.5">
                {stats.sources.slice(0, 6).map((s, i) => {
                  const total = stats.sources.reduce((sum, x) => sum + x.count, 0);
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={s.source} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-foreground">{s.source}</span>
                        <span className="text-muted-foreground tabular-nums">{s.count} · {pct}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 tabular-nums">{stats?.avgTimeToHireDays ?? "—"}</p>
                <p className="text-[11px] text-emerald-600">avg days to hire</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>Pipeline efficiency metric</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Open Positions</h2>
              <p className="text-xs text-muted-foreground">{recentJobs?.length ?? 0} active roles</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" asChild>
              <Link href="/hr/recruitment/jobs">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border/50">
            {jobsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              ))
            ) : !recentJobs?.length ? (
              <div className="py-10 text-center">
                <EmptyPersonIllustration className="mx-auto mb-3 h-24 w-24 opacity-80" />
                <p className="text-xs text-muted-foreground">No open positions yet</p>
              </div>
            ) : (
              recentJobs.slice(0, 5).map((job) => (
                <Link
                  key={job.id}
                  href="/hr/recruitment/jobs"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {job.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{job.location ?? "Remote"} · {job.type}</p>
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
              <p className="text-xs text-muted-foreground">{upcomingInterviews?.length ?? 0} scheduled</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" asChild>
              <Link href="/hr/recruitment/interviews">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border/50">
            {interviewsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
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
                const TypeIcon = (interview.type ? INTERVIEW_TYPE_ICON[interview.type] : null) ?? Calendar;
                return (
                  <div key={interview.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center shrink-0 text-[11px] font-bold text-violet-700">
                      {interview.candidate?.firstName?.[0]}{interview.candidate?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {interview.candidate?.firstName} {interview.candidate?.lastName}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TypeIcon className="h-3 w-3" />
                        <span>{interview.type}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(interview.scheduledAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <Badge
                      variant={interview.result === "PENDING" ? "outline" : "default"}
                      className={`text-[10px] ${interview.result === "PENDING" ? "border-amber-300 text-amber-600" : ""}`}
                    >
                      {interview.result}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
