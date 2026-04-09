"use client";

import { useRecruitmentStats, useJobPostings, useInterviews } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Users, Calendar, UserCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

export default function RecruitmentDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useRecruitmentStats();
  const { data: recentJobs, isLoading: jobsLoading } = useJobPostings({ status: "OPEN" });
  const { data: upcomingInterviews, isLoading: interviewsLoading } = useInterviews({ upcoming: true });

  const isLoading = statsLoading || jobsLoading || interviewsLoading;

  if (isLoading) {
    return (
      <PageWrapper title="Recruitment" subtitle="Hire the best talent for your team">
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-8 w-10" /></CardContent></Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</CardContent></Card>
            <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</CardContent></Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Recruitment"
      subtitle="Hire the best talent for your team"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/candidates">Candidates</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/pipeline">Kanban</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/hr/recruitment/jobs">Jobs</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Jobs", value: stats?.totalJobs ?? 0, icon: Briefcase },
            { label: "Open Positions", value: stats?.openJobs ?? 0, icon: Briefcase },
            { label: "Total Candidates", value: stats?.totalCandidates ?? 0, icon: Users },
            { label: "New Candidates", value: stats?.newCandidates ?? 0, icon: Users },
            { label: "Upcoming Interviews", value: stats?.upcomingInterviews ?? 0, icon: Calendar },
            { label: "Hired (Month)", value: stats?.hiredThisMonth ?? 0, icon: UserCheck },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs">{label}</span>
                </div>
                <p className="text-xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {stats && (stats.funnel || stats.sources?.length > 0) && (
          <div className="grid md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Hiring Funnel</h3>
                <div className="space-y-1.5">
                  {["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"].map((stage) => {
                    const cnt = stats.funnel[stage] ?? 0;
                    const max = Math.max(...Object.values(stats.funnel), 1);
                    return (
                      <div key={stage} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-16 shrink-0">{stage}</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stage === "HIRED" ? "bg-green-500" : stage === "REJECTED" ? "bg-red-400" : "bg-primary"}`}
                            style={{ width: `${Math.max(2, (cnt / max) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums w-6 text-right">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Source Effectiveness</h3>
                {stats.sources.length > 0 ? (
                  <div className="space-y-1.5">
                    {stats.sources.map((s) => {
                      const max = Math.max(...stats.sources.map((x) => x.count), 1);
                      return (
                        <div key={s.source} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-16 shrink-0 truncate">{s.source}</span>
                          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/70 rounded-full" style={{ width: `${Math.max(2, (s.count / max) * 100)}%` }} />
                          </div>
                          <span className="text-xs font-medium tabular-nums w-6 text-right">{s.count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4">
                    <Image
                      src="/illustrations/undraw-online-survey.svg"
                      alt="Empty state illustration"
                      width={200}
                      height={160}
                      className="mx-auto mb-4 opacity-90"
                    />
                    <p className="text-xs text-muted-foreground text-center">No source data</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                <p className="text-3xl font-bold tabular-nums">{stats.avgTimeToHireDays}</p>
                <p className="text-xs text-muted-foreground mt-1">Avg. Days to Hire</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Open Positions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/hr/recruitment/jobs">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {!recentJobs?.length ? (
                <div className="py-4">
                  <Image
                    src="/illustrations/undraw-online-survey.svg"
                    alt="Empty state illustration"
                    width={200}
                    height={160}
                    className="mx-auto mb-4 opacity-90"
                  />
                  <p className="text-sm text-muted-foreground text-center">No open positions yet.</p>
                </div>
              ) : (
                recentJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.location ?? "Remote"} &middot; {job.type}</p>
                    </div>
                    <Badge variant="secondary">{job.openings} opening{(job.openings ?? 1) > 1 ? "s" : ""}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Interviews */}
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Upcoming Interviews</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/hr/recruitment/interviews">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {!upcomingInterviews?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming interviews.</p>
              ) : (
                upcomingInterviews.slice(0, 5).map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium text-sm">
                        {interview.candidate?.firstName} {interview.candidate?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {interview.type} &middot; {formatDistanceToNow(new Date(interview.scheduledAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant={interview.result === "PENDING" ? "outline" : "default"}>
                      {interview.result}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
