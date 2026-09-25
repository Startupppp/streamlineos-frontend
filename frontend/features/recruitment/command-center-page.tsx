"use client";

import { useMemo, useCallback } from "react";
import Link from "next/link";
import { isToday, isPast } from "date-fns";
import { useRecruitmentStats, useJobPostings, useInterviews } from "@/hooks/api/hr";
import { useCandidates, useRecruitmentAnalytics } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { RecruitmentEmptyState } from "@/features/recruitment/components/recruitment-empty-state";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  Briefcase,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
  Layers,
  Users,
  Calendar,
  MessageSquare,
  UserCheck,
  Clock,
  TrendingUp,
} from "lucide-react";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ErrorState } from "@/components/shared/error-state";

const CREATE_ACTIONS = [
  { label: "New requisition", href: "/recruitment/requisitions" },
  { label: "New job post", href: "/recruitment/jobs/new" },
  { label: "Add candidate", href: "/recruitment/candidates" },
  { label: "Import resumes", href: "/recruitment/candidates/import" },
  { label: "Schedule interview", href: "/recruitment/interviews" },
  { label: "Create referral link", href: "/recruitment/refer" },
  { label: "Add vendor", href: "/recruitment/vendors" },
] as const;


function QueueSection({
  title,
  count,
  viewAllHref,
  isLoading,
  isError,
  isEmpty,
  emptyLabel,
  children,
}: {
  title: string;
  count: number;
  viewAllHref: string;
  isLoading: boolean;
  isError?: boolean;
  isEmpty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-gradient-to-r from-blue-500/[0.03] to-transparent">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {count > 0 && (
            <Badge variant="secondary" className="text-micro h-5 font-semibold">
              {count}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-muted-foreground hover:text-foreground" asChild>
          <Link href={viewAllHref}>
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
      <div className="divide-y divide-border/50">
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          ))
        ) : isError ? (
          <p className="text-xs text-status-danger-ink py-8 text-center">Failed to load {title.toLowerCase()}</p>
        ) : isEmpty ? (
          <p className="text-xs text-muted-foreground py-8 text-center">{emptyLabel}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function RecruitmentCommandCenterPage() {
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useRecruitmentStats();
  const { data: analytics } = useRecruitmentAnalytics();
  const { data: openJobs, isLoading: jobsLoading, isError: jobsError } = useJobPostings({ status: "OPEN" });
  const { data: allInterviews, isLoading: interviewsLoading, isError: interviewsError } = useInterviews({ relevant: true });
  const { data: newCandidates, isLoading: candidatesLoading, isError: candidatesError } = useCandidates({ status: "NEW" });

  const interviewsToday = useMemo(
    () => (allInterviews ?? []).filter((i) => isToday(new Date(i.scheduledAt))),
    [allInterviews],
  );

  const overdueFeedback = useMemo(
    () =>
      (allInterviews ?? []).filter(
        (i) => i.result === "PENDING" && isPast(new Date(i.scheduledAt)) && !isToday(new Date(i.scheduledAt)),
      ),
    [allInterviews],
  );

  const rolesWithNoApplicants = useMemo(
    () => (openJobs ?? []).filter((j) => (j._count?.applications ?? 0) === 0),
    [openJobs],
  );

  const handleRetryStats = useCallback(() => {
    void refetchStats();
  }, [refetchStats]);

  const attentionItems = [
    ...(overdueFeedback.length > 0
      ? [{ label: `${overdueFeedback.length} interview${overdueFeedback.length > 1 ? "s" : ""} awaiting feedback`, href: "/recruitment/interviews" }]
      : []),
    ...(rolesWithNoApplicants.length > 0
      ? [{ label: `${rolesWithNoApplicants.length} open role${rolesWithNoApplicants.length > 1 ? "s" : ""} with no applicants`, href: "/recruitment/jobs" }]
      : []),
  ];

  return (
    <PageWrapper
      title="Command Center"
      subtitle="Today's recruiting operations, in one place"
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton icon={PlusIcon} iconSize={14}>
              Create
            </AnimatedIconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {CREATE_ACTIONS.map((action) => (
              <DropdownMenuItem key={action.href} asChild>
                <Link href={action.href}>{action.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-5">
        {statsError ? (
          <ErrorState
            title="Unable to load recruitment data"
            description="Try again. If this keeps happening, check your permissions or contact an admin."
            onRetry={handleRetryStats}
          />
        ) : (
          <>
            {statsLoading ? (
              <StatCardGridSkeleton cols={6} count={analytics ? 7 : 6} />
            ) : (
              <StatCardGrid cols={6}>
                <StatCard label="Open Roles" value={stats?.openJobs ?? 0} icon={Layers} tone="default" />
                <StatCard label="New This Week" value={stats?.newCandidates ?? 0} icon={Users} tone="accent" />
                <StatCard label="Interviews Today" value={interviewsToday.length} icon={Calendar} tone="blue" />
                <StatCard label="Awaiting Feedback" value={overdueFeedback.length} icon={MessageSquare} tone={overdueFeedback.length > 0 ? "amber" : "default"} />
                <StatCard label="Hired This Month" value={stats?.hiredThisMonth ?? 0} icon={UserCheck} tone="emerald" />
                <StatCard label="Avg Days to Hire" value={stats?.avgTimeToHireDays ?? "—"} icon={Clock} tone="default" />
                {analytics && <StatCard label="Hire Rate" value={`${analytics.hireRate}%`} icon={TrendingUp} tone="emerald" />}
              </StatCardGrid>
            )}

            <div className="grid lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2 space-y-4">
                <QueueSection
                  title="New applicants to review"
                  count={newCandidates?.length ?? 0}
                  viewAllHref="/recruitment/candidates/intake"
                  isLoading={candidatesLoading}
                  isError={candidatesError}
                  isEmpty={!newCandidates?.length}
                  emptyLabel="No new applicants right now"
                >
                  {newCandidates?.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href="/recruitment/candidates/intake"
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors duration-150 group"
                    >
                      <div className="w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-dense font-bold text-primary">
                        {c.firstName?.[0]}
                        {c.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <TruncatedText text={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()} className="text-sm font-medium text-foreground" />
                        <p className="text-dense text-muted-foreground mt-0.5">{c.source ?? "Unknown source"}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </QueueSection>

                <QueueSection
                  title="Interviews today"
                  count={interviewsToday.length}
                  viewAllHref="/recruitment/interviews"
                  isLoading={interviewsLoading}
                  isError={interviewsError}
                  isEmpty={!interviewsToday.length}
                  emptyLabel="No interviews scheduled today"
                >
                  {interviewsToday.slice(0, 5).map((interview) => (
                    <div key={interview.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 rounded-full bg-status-info-surface flex items-center justify-center shrink-0 text-dense font-bold text-status-info-ink">
                        {interview.candidate?.firstName?.[0]}
                        {interview.candidate?.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <TruncatedText text={`${interview.candidate?.firstName ?? ""} ${interview.candidate?.lastName ?? ""}`.trim()} className="text-sm font-medium text-foreground" />
                        <p className="text-dense text-muted-foreground mt-0.5">{interview.type}</p>
                      </div>
                    </div>
                  ))}
                </QueueSection>

                <QueueSection
                  title="Roles with no applicants"
                  count={rolesWithNoApplicants.length}
                  viewAllHref="/recruitment/jobs"
                  isLoading={jobsLoading}
                  isError={jobsError}
                  isEmpty={!rolesWithNoApplicants.length}
                  emptyLabel="Every open role has applicants"
                >
                  {rolesWithNoApplicants.slice(0, 5).map((job) => (
                    <Link
                      key={job.id}
                      href="/recruitment/jobs"
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors duration-150 group"
                    >
                      <div className="w-8 rounded-lg bg-status-warning-surface flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-status-warning-ink" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <TruncatedText text={job.title} className="text-sm font-medium text-foreground" />
                        <p className="text-dense text-muted-foreground mt-0.5">{job.location ?? "Remote"}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </QueueSection>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/60">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-status-warning-ink" />
                      Needs attention
                    </h2>
                  </div>
                  <div className="p-3 space-y-1">
                    {attentionItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">Nothing needs attention</p>
                    ) : (
                      attentionItems.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
                        >
                          {item.label}
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/60">
                    <h2 className="text-sm font-semibold text-foreground">Source quality this week</h2>
                  </div>
                  <div className="px-5 py-4">
                    {!stats?.sources?.length ? (
                      <ChartEmptyState message="No source data yet" height={160} compact />
                    ) : (
                      <div className="space-y-3">
                        {stats.sources.slice(0, 6).map((s) => {
                          const total = stats.sources.reduce((sum, x) => sum + x.count, 0);
                          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                          return (
                            <div key={s.source} className="space-y-1">
                              <div className="flex justify-between text-dense">
                                <span className="font-medium text-foreground">{s.source}</span>
                                <span className="text-muted-foreground tabular-nums">
                                  {s.count} · {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary/70 transition-[width] duration-300" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {!statsLoading && !stats?.totalCandidates && (
                  <RecruitmentEmptyState
                    illustration={<EmptyPersonIllustration />}
                    title="No candidates yet"
                    description="Publish a job or import resumes to get started."
                    compact
                    className="rounded-2xl border border-dashed border-border bg-card py-6 px-4 shadow-none"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
