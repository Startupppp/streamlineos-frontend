"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import type { CommandCenterData, PayrollExceptionSeverity, VarianceSummary } from "@/types/payroll/runs";

const SEVERITY_COLORS: Record<PayrollExceptionSeverity, string> = {
  BLOCKER: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  WARNING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  INFO: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
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

function VariancePanel({ summary, runId }: { summary: VarianceSummary | null; runId?: number }) {
  if (!summary) {
    return <p className="text-[11px] text-muted-foreground">No previous run to compare</p>;
  }

  const delta = parseFloat(summary.netDelta);
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-[13px] font-semibold font-mono tabular-nums",
            isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-foreground",
          )}
        >
          {isPositive ? "+" : ""}{formatMoney(summary.netDelta)}
        </span>
        {summary.netDeltaPercent !== 0 && (
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded border",
              isPositive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
                : isNegative
                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(summary.netDeltaPercent).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
          +{summary.newJoiners} joiners
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30">
          -{summary.exited} exits
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
          {summary.changedEmployees} changed
        </span>
      </div>
      {runId && (
        <Link
          href={`/payroll/runs/${runId}?tab=variance`}
          className="text-[11px] text-primary hover:underline"
        >
          View variance details →
        </Link>
      )}
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
            {panels.topExceptions.map((ex) => {
              const href = runId
                ? `/payroll/runs/${runId}?tab=exceptions${ex.runEmployeeId ? `&employee=${ex.runEmployeeId}` : ""}`
                : "#";
              return (
                <Link
                  key={ex.id}
                  href={href}
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
              );
            })}
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
            <span className="text-muted-foreground">Tax declarations</span>
            <span
              className={cn(
                "font-medium",
                panels.statutoryReadiness.taxDeclarationsLocked ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {panels.statutoryReadiness.taxDeclarationsLocked ? "Locked" : "Open"}
            </span>
          </div>
          {panels.statutoryReadiness.packComplianceChecklist.length > 0 && (
            <div className="mt-1 space-y-0.5 border-t border-border pt-1">
              {panels.statutoryReadiness.packComplianceChecklist.map((item) => (
                <div key={item.key} className="flex items-start gap-1.5 py-0.5">
                  <span className="text-muted-foreground shrink-0 mt-px">·</span>
                  <span className="text-foreground leading-snug">{item.label}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Run status</span>
            <span className="font-medium text-foreground capitalize">
              {panels.runStatus?.toLowerCase().replace(/_/g, " ") ?? "No run"}
            </span>
          </div>
          {!panels.payoutReadiness && runId && (
            <Link
              href={`/payroll/runs/${runId}`}
              className="block text-[11px] text-primary hover:underline pt-1"
            >
              Complete run to unlock payout →
            </Link>
          )}
        </div>
      </PanelCard>

      <PanelCard title="Changes vs Last Month">
        <VariancePanel summary={panels.varianceSummary} runId={runId} />
      </PanelCard>

      <PanelCard title="Pending Approvals">
        {panels.pendingApprovals.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No pending approvals</p>
        ) : (
          <div className="space-y-1">
            {panels.pendingApprovals.map((approval) => (
              <Link
                key={approval.id}
                href={runId ? `/payroll/runs/${runId}?tab=approvals` : "#"}
                className="flex items-center justify-between text-[11px] py-1 hover:bg-muted/20 -mx-1 px-1 rounded"
              >
                <span className="text-foreground">Stage {approval.stage}</span>
                <span className="text-amber-600 font-medium">{approval.status}</span>
              </Link>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard title="Upcoming Calendar" className="lg:col-span-2">
        {upcomingCalendarEvents.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No upcoming events</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
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
