"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import type { CommandCenterData, PayrollExceptionSeverity } from "@/types/payroll/runs";

const SEVERITY_COLORS: Record<PayrollExceptionSeverity, string> = {
  BLOCKER: "bg-red-50 text-red-700 border-red-200",
  WARNING: "bg-amber-50 text-amber-700 border-amber-200",
  INFO: "bg-blue-50 text-blue-700 border-blue-200",
};

function PanelCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-2", className)}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

interface CommandCenterPanelsProps {
  data: CommandCenterData;
  runId?: number;
}

export function CommandCenterPanels({ data, runId }: CommandCenterPanelsProps) {
  const { panels, upcomingCalendarEvents } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <PanelCard title="Exceptions Requiring Action">
        {panels.topExceptions.length === 0 ? (
          <p className="text-[11px] text-emerald-600">No open exceptions</p>
        ) : (
          <div className="space-y-1">
            {panels.topExceptions.map((ex) => (
              <Link
                key={ex.id}
                href={runId ? `/payroll/runs/${runId}?tab=exceptions` : "#"}
                className="flex items-center gap-2 py-1 hover:bg-muted/20 -mx-1 px-1 rounded"
              >
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                    SEVERITY_COLORS[ex.severity]
                  }`}
                >
                  {ex.severity}
                </span>
                <span className="text-[11px] text-foreground truncate flex-1">{ex.message}</span>
              </Link>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard title="Payout Readiness">
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payout ready</span>
            <span
              className={cn(
                "font-medium",
                panels.payoutReadiness ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {panels.payoutReadiness ? "Ready" : "Not ready"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Statutory complete</span>
            <span
              className={cn(
                "font-medium",
                panels.statutoryReadiness ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {panels.statutoryReadiness ? "Complete" : "Pending"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Run status</span>
            <span className="font-medium text-foreground capitalize">
              {panels.runStatus?.toLowerCase().replace(/_/g, " ") ?? "No run"}
            </span>
          </div>
        </div>
      </PanelCard>

      <PanelCard title="Pending Approvals">
        {panels.pendingApprovals.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No pending approvals</p>
        ) : (
          <div className="space-y-1">
            {panels.pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-center justify-between text-[11px] py-1"
              >
                <span className="text-foreground">Stage {approval.stage}</span>
                <span className="text-amber-600 font-medium">{approval.status}</span>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard title="Upcoming Calendar">
        {upcomingCalendarEvents.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No upcoming events</p>
        ) : (
          <div className="space-y-1">
            {upcomingCalendarEvents.map((event) => {
              const eventDate = new Date(event.date);
              const isToday = event.date === new Date().toISOString().slice(0, 10);
              const isPast = eventDate < new Date();
              return (
                <div key={event.id} className="flex items-center gap-2 text-[11px] py-0.5">
                  <span
                    className={cn(
                      "font-mono tabular-nums shrink-0",
                      isPast ? "text-red-600" : isToday ? "text-amber-600" : "text-muted-foreground",
                    )}
                  >
                    {event.date}
                  </span>
                  <span className="text-foreground truncate flex-1">{event.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </PanelCard>
    </div>
  );
}
