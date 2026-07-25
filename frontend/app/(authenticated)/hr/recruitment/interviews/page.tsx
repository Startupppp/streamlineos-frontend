"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useInterviews, useInterviewStats } from "@/hooks/api/hr";
import type { Interview } from "@/types/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import {
  Settings,
  List,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  BarChart2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@animateicons/react/lucide";
import dynamic from "next/dynamic";
import type {
  BigCalEvent,
  View,
} from "@/features/calendar/big-calendar-wrapper";

const BigCalendarWrapper = dynamic(
  () =>
    import("@/features/calendar/big-calendar-wrapper").then((m) => ({
      default: m.BigCalendarWrapper,
    })),
  { ssr: false },
);
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  format as fmtDate,
} from "date-fns";
import { InterviewFeedbackForm } from "@/features/hr/recruitment/interview-feedback-form";
import { InterviewList } from "@/features/hr/recruitment/interviews/interview-list";
import { InterviewFormSheet } from "@/features/hr/recruitment/interviews/interview-form-sheet";
import { ErrorState } from "@/components/shared/error-state";

type PageViewMode = "list" | "calendar";

const PAGE_VIEW_OPTIONS: ViewOption<PageViewMode>[] = [
  { value: "list", icon: List, label: "List View" },
  { value: "calendar", icon: CalendarDays, label: "Calendar View" },
];

type CalSubView = "month" | "week";

const CAL_SUB_VIEW_OPTIONS: ViewOption<CalSubView>[] = [
  { value: "month", icon: CalendarDays, label: "Month" },
  { value: "week", icon: CalendarRange, label: "Week" },
];

export default function InterviewsPage() {
  const { data: interviews, isLoading, isError, refetch } = useInterviews({
    pageSize: 100,
  });
  const { data: stats } = useInterviewStats();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState<Interview | null>(
    null,
  );
  const [pageView, setPageView] = useState<"list" | "calendar">("list");
  const [calView, setCalView] = useState<View>("month");
  const [calDate, setCalDate] = useState(new Date());

  const interviewStats = {
    total: stats?.total ?? 0,
    pending: stats?.pending ?? 0,
    passed: stats?.passed ?? 0,
    failed: stats?.failed ?? 0,
  };

  const calEvents = useMemo(
    () =>
      (interviews ?? []).map(
        (iv): BigCalEvent => ({
          id: iv.id,
          title: `${iv.candidate?.firstName ?? ""} ${iv.candidate?.lastName ?? ""} — ${iv.type ?? "Interview"}`,
          start: new Date(iv.scheduledAt),
          end: new Date(
            new Date(iv.scheduledAt).getTime() + (iv.duration ?? 60) * 60_000,
          ),
          resource: {
            color:
              iv.result === "PASSED"
                ? "#10b981"
                : iv.result === "FAILED"
                  ? "#ef4444"
                  : "#1e40af",
          },
        }),
      ),
    [interviews],
  );

  const handleCalNavigatePrev = useCallback(() => {
    setCalDate((d) => (calView === "month" ? subMonths(d, 1) : subWeeks(d, 1)));
  }, [calView]);

  const handleCalNavigateNext = useCallback(() => {
    setCalDate((d) => (calView === "month" ? addMonths(d, 1) : addWeeks(d, 1)));
  }, [calView]);

  const handleCalEventSelect = useCallback(
    (e: BigCalEvent) => {
      const iv = interviews?.find((i) => i.id === e.id);
      if (iv) setFeedbackInterview(iv);
    },
    [interviews],
  );

  const handleFeedbackClose = useCallback((open: boolean) => {
    if (!open) setFeedbackInterview(null);
  }, []);

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

      <div className="flex items-center justify-between">
        <ViewToggle<PageViewMode>
          value={pageView}
          options={PAGE_VIEW_OPTIONS}
          onChange={setPageView}
          showLabel
        />
        {pageView === "calendar" && (
          <div className="flex items-center gap-2">
            <AnimatedIconButton
              icon={ChevronLeftIcon}
              iconSize={16}
              variant="outline"
              size="icon"
              className="h-7 w-7"
              aria-label="Previous"
              onClick={handleCalNavigatePrev}
            />
            <span className="text-sm font-medium tabular-nums min-w-[120px] text-center">
              {calView === "month"
                ? fmtDate(calDate, "MMMM yyyy")
                : `Week of ${fmtDate(calDate, "MMM d")}`}
            </span>
            <AnimatedIconButton
              icon={ChevronRightIcon}
              iconSize={16}
              variant="outline"
              size="icon"
              className="h-7 w-7"
              aria-label="Next"
              onClick={handleCalNavigateNext}
            />
            <ViewToggle<CalSubView>
              value={calView === "week" ? "week" : "month"}
              options={CAL_SUB_VIEW_OPTIONS}
              onChange={setCalView}
              showLabel
            />
          </div>
        )}
      </div>

      {pageView === "calendar" ? (
        <div className="flex-1 min-h-0 rounded-xl border border-border overflow-hidden">
          <BigCalendarWrapper
            events={calEvents}
            date={calDate}
            view={calView}
            calHeight={520}
            onView={setCalView}
            onNavigate={setCalDate}
            onSelectEvent={handleCalEventSelect}
            eventPropGetter={(e) => ({
              style: {
                backgroundColor:
                  (e as BigCalEvent).resource?.color ?? "#1e40af",
                color: "#fff",
                borderRadius: 4,
                border: "none",
                fontSize: 11,
              },
            })}
          />
        </div>
      ) : (
        <InterviewList />
      )}

      {feedbackInterview && (
        <InterviewFeedbackForm
          interview={feedbackInterview}
          open={feedbackInterview !== null}
          onOpenChange={handleFeedbackClose}
        />
      )}
      </div>
    </PageWrapper>
  );
}
