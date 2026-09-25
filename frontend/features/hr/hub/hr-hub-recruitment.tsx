"use client";

import Link from "next/link";
import { ArrowRight, Calendar, FileCheck, Briefcase, TrendingUp } from "lucide-react";
import { isToday, isPast } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HrSectionHeader } from "@/features/hr/shared/hr-ui";
import { hubSectionData, hubSectionError } from "@/hooks/api/hr/hub";
import type { HrHubViewProps } from "@/hooks/api/hr/hub-types";
import { ErrorRetry } from "./today/today-card";

interface RecruitmentCountCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  href: string;
  tone?: "amber" | "default";
}

function RecruitmentCountCard({
  icon: Icon,
  label,
  count,
  isLoading,
  isError,
  onRetry,
  href,
  tone = "default",
}: RecruitmentCountCardProps) {
  const toneClasses = {
    amber: "text-status-warning-ink bg-status-warning-surface",
    default: "text-primary/70 bg-primary/10",
  };

  if (isError) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-3.5">
        <p className="mb-2 text-xs font-medium text-foreground">{label}</p>
        <ErrorRetry
          error={new Error("This section is temporarily unavailable.")}
          onRetry={onRetry}
        />
      </div>
    );
  }

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

export function HrHubRecruitment({
  access,
  snapshot,
  isLoading,
  onRetry,
}: HrHubViewProps) {
  const sections = snapshot?.sections;
  const interviewsResponse = hubSectionData(sections?.interviews);
  const interviews = interviewsResponse?.items ?? [];
  const offers = hubSectionData(sections?.pendingOffers);
  const requisitions = hubSectionData(sections?.pendingRequisitions);
  const stats = hubSectionData(sections?.recruitmentStats);

  const hasAnyRecruitmentAccess =
    access.canInterviews || access.canOffers || access.canRequisitions;

  const recruitmentHref = access.canRequisitions
    ? "/recruitment"
    : access.canInterviews
      ? "/recruitment/interviews"
      : "/recruitment/offers";

  if (!hasAnyRecruitmentAccess) return null;

  const interviewsToday = interviews.filter(
    (i) => isToday(new Date(i.scheduledAt)),
  ).length;

  const awaitingScorecard = interviews.filter(
    (i) => i.result === "PENDING" && isPast(new Date(i.scheduledAt)) && !isToday(new Date(i.scheduledAt)),
  ).length;

  const pendingOffers = offers?.total ?? 0;
  const pendingRequisitions = (requisitions ?? []).length;
  const openRoles = stats?.openJobs ?? 0;

  return (
    <div className="space-y-2.5">
      <HrSectionHeader
        title="Recruitment"
        description={
          stats
            ? `${openRoles} open role${openRoles !== 1 ? "s" : ""} · ${stats.newCandidates ?? 0} new applicants`
            : "Hiring pipeline status"
        }
        action={{ label: "View recruitment", href: recruitmentHref }}
      />

      {isLoading ? (
        <div className="flex items-center gap-2 py-1">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ) : hubSectionError(sections?.recruitmentStats) ? (
        <ErrorRetry
          error={hubSectionError(sections?.recruitmentStats)}
          onRetry={onRetry}
        />
      ) : stats && openRoles > 0 ? (
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-micro font-medium px-2.5 py-1 rounded-full bg-status-success-surface text-status-success-ink">
            {stats.hiredThisMonth ?? 0} hired this month
          </span>
          {(stats.avgTimeToHireDays ?? 0) > 0 && (
            <span className="text-micro font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              {stats.avgTimeToHireDays}d avg to hire
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-6 text-micro px-2 text-status-info-ink ml-auto" asChild>
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
            isLoading={isLoading}
            isError={Boolean(hubSectionError(sections?.interviews))}
            onRetry={onRetry}
            href="/recruitment/interviews"
            tone={interviewsToday > 0 ? "default" : "default"}
          />
        )}
        {access.canInterviews && (
          <RecruitmentCountCard
            icon={TrendingUp}
            label="Awaiting scorecard"
            count={awaitingScorecard}
            isLoading={isLoading}
            isError={Boolean(hubSectionError(sections?.interviews))}
            onRetry={onRetry}
            href="/recruitment/interviews"
            tone={awaitingScorecard > 0 ? "amber" : "default"}
          />
        )}
        {access.canOffers && (
          <RecruitmentCountCard
            icon={FileCheck}
            label="Offers pending"
            count={pendingOffers}
            isLoading={isLoading}
            isError={Boolean(hubSectionError(sections?.pendingOffers))}
            onRetry={onRetry}
            href="/recruitment/offers"
            tone={pendingOffers > 0 ? "amber" : "default"}
          />
        )}
        {access.canRequisitions && (
          <RecruitmentCountCard
            icon={Briefcase}
            label="Requisitions pending"
            count={pendingRequisitions}
            isLoading={isLoading}
            isError={Boolean(hubSectionError(sections?.pendingRequisitions))}
            onRetry={onRetry}
            href="/recruitment/requisitions"
            tone={pendingRequisitions > 0 ? "amber" : "default"}
          />
        )}
      </div>
    </div>
  );
}
