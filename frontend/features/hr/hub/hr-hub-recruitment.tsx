"use client";

import Link from "next/link";
import { ArrowRight, Calendar, FileCheck, Briefcase, TrendingUp } from "lucide-react";
import { isToday, isPast } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInterviews, useAllOffers, useJobRequisitions, useRecruitmentStats } from "@/hooks/api/hr";
import { HrSectionHeader } from "@/features/hr/shared/hr-ui";
import type { HrHubAccess } from "./use-hr-hub-access";

interface RecruitmentCountCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number | undefined;
  isLoading: boolean;
  href: string;
  tone?: "amber" | "default";
}

function RecruitmentCountCard({ icon: Icon, label, count, isLoading, href, tone = "default" }: RecruitmentCountCardProps) {
  const toneClasses = {
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
    default: "text-primary/70 bg-primary/10",
  };

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        {isLoading ? (
          <Skeleton className="h-5 w-8 mt-0.5" />
        ) : (
          <p className="text-lg font-bold text-foreground leading-tight">{count ?? 0}</p>
        )}
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

interface HrHubRecruitmentProps {
  access: HrHubAccess;
}

export function HrHubRecruitment({ access }: HrHubRecruitmentProps) {
  const interviews = useInterviews(
    { relevant: true, pageSize: 50 },
    { enabled: access.canInterviews },
  );
  const offers = useAllOffers({ status: "PENDING_APPROVAL", pageSize: 1 });
  const requisitions = useJobRequisitions("PENDING_APPROVAL");
  const stats = useRecruitmentStats();

  const hasAnyRecruitmentAccess =
    access.canInterviews || access.canOffers || access.canRequisitions;

  const recruitmentHref = access.canRequisitions
    ? "/hr/recruitment"
    : access.canInterviews
      ? "/hr/recruitment/interviews"
      : "/hr/recruitment/offers";

  if (!hasAnyRecruitmentAccess) return null;

  const interviewsToday = (interviews.data ?? []).filter(
    (i) => isToday(new Date(i.scheduledAt)),
  ).length;

  const awaitingScorecard = (interviews.data ?? []).filter(
    (i) => i.result === "PENDING" && isPast(new Date(i.scheduledAt)) && !isToday(new Date(i.scheduledAt)),
  ).length;

  const pendingOffers = offers.data?.total ?? 0;
  const pendingRequisitions = (requisitions.data ?? []).length;
  const openRoles = stats.data?.openJobs ?? 0;

  return (
    <div className="space-y-2.5">
      <HrSectionHeader
        title="Recruitment"
        description={
          stats.data
            ? `${openRoles} open role${openRoles !== 1 ? "s" : ""} · ${stats.data.newCandidates ?? 0} new applicants`
            : "Hiring pipeline status"
        }
        action={{ label: "View recruitment", href: recruitmentHref }}
      />

      {stats.isLoading ? (
        <div className="flex items-center gap-2 py-1">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ) : stats.data && openRoles > 0 ? (
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            {stats.data.hiredThisMonth ?? 0} hired this month
          </span>
          {(stats.data.avgTimeToHireDays ?? 0) > 0 && (
            <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              {stats.data.avgTimeToHireDays}d avg to hire
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-blue-600 dark:text-blue-400 ml-auto" asChild>
            <Link href={recruitmentHref}>
              View all <ArrowRight className="h-3 w-3 ml-0.5" />
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {access.canInterviews && (
          <RecruitmentCountCard
            icon={Calendar}
            label="Interviews today"
            count={interviewsToday}
            isLoading={interviews.isLoading}
            href="/hr/recruitment/interviews"
            tone={interviewsToday > 0 ? "default" : "default"}
          />
        )}
        {access.canInterviews && (
          <RecruitmentCountCard
            icon={TrendingUp}
            label="Awaiting scorecard"
            count={awaitingScorecard}
            isLoading={interviews.isLoading}
            href="/hr/recruitment/interviews"
            tone={awaitingScorecard > 0 ? "amber" : "default"}
          />
        )}
        {access.canOffers && (
          <RecruitmentCountCard
            icon={FileCheck}
            label="Offers pending"
            count={pendingOffers}
            isLoading={offers.isLoading}
            href="/hr/recruitment/offers"
            tone={pendingOffers > 0 ? "amber" : "default"}
          />
        )}
        {access.canRequisitions && (
          <RecruitmentCountCard
            icon={Briefcase}
            label="Requisitions pending"
            count={pendingRequisitions}
            isLoading={requisitions.isLoading}
            href="/hr/recruitment/requisitions"
            tone={pendingRequisitions > 0 ? "amber" : "default"}
          />
        )}
      </div>
    </div>
  );
}
