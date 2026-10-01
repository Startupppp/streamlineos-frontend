"use client";

import { format, parseISO } from "date-fns";
import { RichPanel, RichSectionHeader } from "@/components/shared/rich-surface";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ManagerHome } from "@/hooks/api/hr/manager-home-schema";

const LEAVE_STATUS: Record<ManagerHome["upcomingLeave"][number]["status"], { label: string; tone: StatusTone }> = {
  APPROVED: { label: "Approved", tone: "success" },
  PENDING: { label: "Pending", tone: "warning" },
  REJECTED: { label: "Rejected", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

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

interface TeamCoveragePanelsProps {
  upcomingLeave: ManagerHome["upcomingLeave"];
  missingTimesheets: ManagerHome["missingTimesheets"];
  probationDue: ManagerHome["probationDue"];
}

export function TeamCoveragePanels({ upcomingLeave, missingTimesheets, probationDue }: TeamCoveragePanelsProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <RichPanel>
          <RichSectionHeader
            title="Upcoming leave"
            description="Approved leave in the next two weeks"
            action={{ label: "Leave calendar", href: "/hr/leaves" }}
          />
          {upcomingLeave.length === 0 ? (
            <p className="text-dense text-muted-foreground">No approved leave in the next two weeks.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcomingLeave.map((leave) => (
                <li key={`${leave.userId}-${leave.startDate}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm text-foreground">{leave.name}</span>
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
          <RichSectionHeader
            title="Missing timesheets"
            description="Periods that ended without being submitted or were sent back"
            action={{ label: "Overdue queue", href: "/timesheets/overdue" }}
          />
          {missingTimesheets.length === 0 ? (
            <p className="text-dense text-muted-foreground">Every past period on your team is submitted.</p>
          ) : (
            <ul className="divide-y divide-border">
              {missingTimesheets.map((period) => (
                <li key={period.periodId} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-foreground">{period.name ?? "Team member"}</span>
                  <span className="text-dense text-muted-foreground tabular-nums">
                    {format(parseISO(period.periodStart), "MMM d")} – {format(parseISO(period.periodEnd), "MMM d")} ·{" "}
                    {period.status.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </RichPanel>
      </div>

      {probationDue.length > 0 ? (
        <RichPanel>
          <RichSectionHeader
            title="Probation ending soon"
            action={{ label: "Probation reviews", href: "/hr/onboarding/probation" }}
          />
          <ul className="divide-y divide-border">
            {probationDue.map((row) => (
              <li key={row.userId} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-foreground">{row.name ?? "Team member"}</span>
                <span className="text-dense text-muted-foreground">
                  {row.daysLeft < 0
                    ? `ended ${-row.daysLeft} days ago`
                    : row.daysLeft === 0
                      ? "ends today"
                      : `${row.daysLeft} days left`}{" "}
                  · {format(parseISO(row.probationEndDate), "MMM d")}
                </span>
              </li>
            ))}
          </ul>
        </RichPanel>
      ) : null}
    </>
  );
}
