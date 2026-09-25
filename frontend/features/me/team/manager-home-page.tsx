"use client";

import { useCallback } from "react";
import { format, parseISO } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { RichPageContent, RichPanel, RichSectionHeader } from "@/components/shared/rich-surface";
import { usePageState } from "@/hooks/api/use-page-state";
import { useManagerHome } from "@/hooks/api/hr/manager-home";
import type { ManagerHome } from "@/hooks/api/hr/manager-home-schema";
import { TeamApprovalsList } from "./team-approvals-list";
import { TeamRoster } from "./team-roster";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const LEAVE_STATUS: Record<ManagerHome["upcomingLeave"][number]["status"], { label: string; tone: StatusTone }> = {
  APPROVED: { label: "Approved", tone: "success" },
  PENDING: { label: "Pending", tone: "warning" },
  REJECTED: { label: "Rejected", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

/** The row's own status from the API, so the list evidences its "Approved" heading (HRMS-E2E-021). */
function LeaveStatusBadge({ status }: { status: ManagerHome["upcomingLeave"][number]["status"] }) {
  const { label, tone } = LEAVE_STATUS[status];
  const classes = statusToneClasses(tone);
  return (
    <span
      aria-label={`Leave status: ${label}`}
      className={cn("rounded-full border px-2 py-0.5 text-micro", classes.surface, classes.ink, classes.rule)}
    >
      {label}
    </span>
  );
}

function ManagerHomeSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <StatCardGridSkeleton cols={4} count={4} />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export function ManagerHomePage() {
  const { data, isLoading, isError, error, refetch } = useManagerHome();
  const pageState = usePageState({ isLoading, isError, error });
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const pendingTotal = data ? data.approvals.leave + data.approvals.wfh + data.approvals.timesheets + data.approvals.workflows : 0;

  return (
    <PageWrapper variant="display" title="My team" subtitle={data ? `${data.reports.length} direct ${data.reports.length === 1 ? "report" : "reports"}` : undefined}>
      <PageState resolution={pageState} loading={<ManagerHomeSkeleton />} onRetry={handleRetry} className="flex-1">
        {data && !data.isManager ? (
          <EmptyState
            title="Nobody reports to you yet"
            description="When an employee's reporting line names you as their manager, their requests, timesheets, leave and probation reviews will appear here."
            action={{ label: "Open the people directory", href: "/directory" }}
          />
        ) : data ? (
          <RichPageContent>
            <StatCardGrid cols={4}>
              <StatCard label="Awaiting my decision" value={pendingTotal} tone={pendingTotal > 0 ? "amber" : "emerald"} />
              <StatCard label="On leave today" value={data.reports.filter((report) => report.onLeaveToday).length} />
              <StatCard label="Missing timesheets" value={data.missingTimesheets.length} tone={data.missingTimesheets.length > 0 ? "red" : "emerald"} href="/timesheets/overdue" />
              <StatCard label="Probation ending soon" value={data.probationDue.length} tone={data.probationDue.length > 0 ? "amber" : "default"} href="/hr/onboarding/probation" />
            </StatCardGrid>

            <RichPanel>
              <RichSectionHeader title="Needs my decision" description="Requests routed to you as reporting manager, oldest first" />
              <TeamApprovalsList items={data.approvals.items} />
            </RichPanel>

            <RichPanel>
              <RichSectionHeader title="Direct reports" description="Who is in today, whose timesheets are behind, and whose probation is ending" />
              <TeamRoster reports={data.reports} />
            </RichPanel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <RichPanel>
                <RichSectionHeader title="Upcoming leave" description="Approved leave in the next two weeks" action={{ label: "Leave calendar", href: "/hr/leaves" }} />
                {data.upcomingLeave.length === 0 ? (
                  <p className="text-dense text-muted-foreground">No approved leave in the next two weeks.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.upcomingLeave.map((leave) => (
                      <li key={`${leave.userId}-${leave.startDate}`} className="flex items-center justify-between gap-3 py-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-sm text-foreground truncate">{leave.name}</span>
                          <LeaveStatusBadge status={leave.status} />
                        </span>
                        <span className="text-dense text-muted-foreground tabular-nums">
                          {format(parseISO(leave.startDate), "MMM d")}
                          {leave.endDate !== leave.startDate ? ` – ${format(parseISO(leave.endDate), "MMM d")}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </RichPanel>
              <RichPanel>
                <RichSectionHeader title="Missing timesheets" description="Periods that ended without being submitted or were sent back" action={{ label: "Overdue queue", href: "/timesheets/overdue" }} />
                {data.missingTimesheets.length === 0 ? (
                  <p className="text-dense text-muted-foreground">Every past period on your team is submitted.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.missingTimesheets.map((period) => (
                      <li key={period.periodId} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-sm text-foreground">{period.name ?? "Team member"}</span>
                        <span className="text-dense text-muted-foreground tabular-nums">
                          {format(parseISO(period.periodStart), "MMM d")} – {format(parseISO(period.periodEnd), "MMM d")} · {period.status.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </RichPanel>
            </div>

            {data.probationDue.length > 0 ? (
              <RichPanel>
                <RichSectionHeader title="Probation ending soon" action={{ label: "Probation reviews", href: "/hr/onboarding/probation" }} />
                <ul className="divide-y divide-border">
                  {data.probationDue.map((row) => (
                    <li key={row.userId} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm text-foreground">{row.name ?? "Team member"}</span>
                      <span className="text-dense text-muted-foreground">
                        {row.daysLeft < 0 ? `ended ${-row.daysLeft} days ago` : row.daysLeft === 0 ? "ends today" : `${row.daysLeft} days left`} · {format(parseISO(row.probationEndDate), "MMM d")}
                      </span>
                    </li>
                  ))}
                </ul>
              </RichPanel>
            ) : null}
          </RichPageContent>
        ) : null}
      </PageState>
    </PageWrapper>
  );
}
