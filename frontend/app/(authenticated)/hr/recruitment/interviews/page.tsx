"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useInterviews } from "@/lib/api/hooks/hr";
import type { Interview } from "@/types/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, List, CalendarDays, ChevronLeft, ChevronRight, CalendarClock, BarChart2, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import type { BigCalEvent, View } from "@/features/calendar/big-calendar-wrapper";

const BigCalendarWrapper = dynamic(
  () =>
    import("@/features/calendar/big-calendar-wrapper").then((m) => ({
      default: m.BigCalendarWrapper,
    })),
  { ssr: false },
);
import { addMonths, subMonths, addWeeks, subWeeks, format as fmtDate } from "date-fns";
import { InterviewFeedbackForm } from "@/features/hr/recruitment/interview-feedback-form";
import { InterviewList } from "@/features/hr/recruitment/interviews/interview-list";
import { InterviewFormSheet } from "@/features/hr/recruitment/interviews/interview-form-sheet";
import { cn } from "@/lib/utils";

export default function InterviewsPage() {
  const { data: interviews, isLoading } = useInterviews();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState<Interview | null>(null);
  const [pageView, setPageView] = useState<"list" | "calendar">("list");
  const [calView, setCalView] = useState<View>("month");
  const [calDate, setCalDate] = useState(new Date());

  const calEvents = useMemo(
    () =>
      (interviews ?? []).map((iv): BigCalEvent => ({
        id: iv.id,
        title: `${iv.candidate?.firstName ?? ""} ${iv.candidate?.lastName ?? ""} — ${iv.type ?? "Interview"}`,
        start: new Date(iv.scheduledAt),
        end: new Date(new Date(iv.scheduledAt).getTime() + (iv.duration ?? 60) * 60_000),
        resource: {
          color:
            iv.result === "PASSED"
              ? "#10b981"
              : iv.result === "FAILED"
                ? "#ef4444"
                : "#1e40af",
        },
      })),
    [interviews],
  );

  function handleCalNavigatePrev() {
    setCalDate((d) =>
      calView === "month" ? subMonths(d, 1) : subWeeks(d, 1),
    );
  }

  function handleCalNavigateNext() {
    setCalDate((d) =>
      calView === "month" ? addMonths(d, 1) : addWeeks(d, 1),
    );
  }

  function handleCalEventSelect(e: BigCalEvent) {
    const iv = interviews?.find((i) => i.id === e.id);
    if (iv) setFeedbackInterview(iv);
  }

  function handleFeedbackClose(open: boolean) {
    if (!open) setFeedbackInterview(null);
  }

  function handlePageViewList() {
    setPageView("list");
  }

  function handlePageViewCalendar() {
    setPageView("calendar");
  }

  const handleOpenSchedule = useCallback(() => setSheetOpen(true), []);

  if (isLoading) {
    return (
      <PageWrapper title="Interviews" subtitle="Schedule and track interviews">
        <Card>
          <CardContent className="pt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Interviews"
      subtitle="Schedule and track interviews"
      badge={`${interviews?.length ?? 0} interviews`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/recruitment">Back</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/interviewer-performance">
              <BarChart2 className="mr-1.5 h-3.5 w-3.5" />
              Performance
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/sla-report">
              <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
              SLA Report
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/sla">
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              SLA Config
            </Link>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleOpenSchedule}>
            <Plus className="h-4 w-4" /> Schedule
          </Button>
          <InterviewFormSheet open={sheetOpen} onOpenChange={setSheetOpen} />
        </div>
      }
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              pageView === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
            onClick={handlePageViewList}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              pageView === "calendar" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
            onClick={handlePageViewCalendar}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </button>
        </div>
        {pageView === "calendar" && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCalNavigatePrev}
              className="rounded-md border p-1 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium tabular-nums min-w-[120px] text-center">
              {calView === "month"
                ? fmtDate(calDate, "MMMM yyyy")
                : `Week of ${fmtDate(calDate, "MMM d")}`}
            </span>
            <button
              onClick={handleCalNavigateNext}
              className="rounded-md border p-1 hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              {(["month", "week"] as View[]).map((v) => (
                <button
                  key={v}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs capitalize",
                    calView === v ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                  onClick={() => setCalView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {pageView === "calendar" ? (
        <Card>
          <CardContent className="p-4 h-[520px]">
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
                  backgroundColor: (e as BigCalEvent).resource?.color ?? "#1e40af",
                  color: "#fff",
                  borderRadius: 4,
                  border: "none",
                  fontSize: 11,
                },
              })}
            />
          </CardContent>
        </Card>
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
    </PageWrapper>
  );
}
