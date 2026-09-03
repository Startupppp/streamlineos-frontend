"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useInterviews, useInterviewStats } from "@/hooks/api/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import {
  Settings,
  CalendarDays,
  CalendarClock,
  BarChart2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { InterviewList } from "@/features/hr/recruitment/interviews/interview-list";
import { InterviewFormSheet } from "@/features/hr/recruitment/interviews/interview-form-sheet";
import { ErrorState } from "@/components/shared/error-state";

/**
 * Interviews are a SOURCE on the one unified calendar, never a calendar of
 * their own (root CLAUDE.md §8). `hr-interviews` is already registered with
 * `CalendarSourceRegistry`, so `/calendar` renders these events beside every
 * other source; the deep link turns that source on if the viewer has it off.
 */
const INTERVIEW_CALENDAR_HREF = "/calendar?source=hr-interviews";

export function InterviewsPage() {
  const { isLoading, isError, refetch } = useInterviews({ pageSize: 100 });
  const { data: stats } = useInterviewStats();

  const [sheetOpen, setSheetOpen] = useState(false);

  const interviewStats = {
    total: stats?.total ?? 0,
    pending: stats?.pending ?? 0,
    passed: stats?.passed ?? 0,
    failed: stats?.failed ?? 0,
  };

  const handleOpenSchedule = useCallback(() => setSheetOpen(true), []);

  if (isError) {
    return (
      <PageWrapper title="Interviews" subtitle="Schedule and track interviews">
        <ErrorState
          title="Unable to load interviews"
          description="You may not have permission to view interviews, or the server returned an unexpected response. Try again."
          onRetry={refetch}
        />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Interviews" subtitle="Schedule and track interviews">
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  const totalLabel = interviewStats.total;
  const subtitle =
    totalLabel > 0
      ? `${totalLabel} interview${totalLabel === 1 ? "" : "s"} · ${interviewStats.pending} scheduled`
      : "Schedule and track interviews";

  return (
    <PageWrapper
      title="Interviews"
      subtitle={subtitle}
      backHref="/hr/recruitment"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={INTERVIEW_CALENDAR_HREF}>
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View in calendar</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/interviewer-performance">
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Performance</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/sla-report">
              <CalendarClock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">SLA Report</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/sla">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">SLA Config</span>
            </Link>
          </Button>
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            size="sm"
            className="gap-1.5"
            onClick={handleOpenSchedule}
          >
            <span className="hidden sm:inline">Schedule</span>
          </AnimatedIconButton>
          <InterviewFormSheet open={sheetOpen} onOpenChange={setSheetOpen} />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGrid cols={4}>
          <StatCard label="Total" value={interviewStats.total} icon={BarChart2} />
          <StatCard label="Scheduled" value={interviewStats.pending} icon={CalendarClock} tone="amber" />
          <StatCard label="Passed" value={interviewStats.passed} icon={CheckCircle2} tone="emerald" />
          <StatCard label="Failed" value={interviewStats.failed} icon={XCircle} tone="red" />
        </StatCardGrid>

        <InterviewList />
      </div>
    </PageWrapper>
  );
}
