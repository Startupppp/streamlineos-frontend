"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { CommandCenterData, PayrollExceptionSeverity, VarianceSummary } from "@/types/payroll/runs";

const SEVERITY_COLORS: Record<PayrollExceptionSeverity, string> = {
  BLOCKER: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  WARNING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  INFO: "bg-status-info-surface text-status-info-ink border-status-info-rule",
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
    return <p className="text-dense text-muted-foreground">No previous run to compare</p>;
  }

  const delta = parseFloat(summary.netDelta);
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-label font-semibold font-mono tabular-nums",
            isPositive ? "text-status-success-ink" : isNegative ? "text-status-danger-ink" : "text-foreground",
          )}
        >
          {isPositive ? "+" : ""}{formatMoney(summary.netDelta)}
        </span>
        {summary.netDeltaPercent !== 0 && (
          <span
            className={cn(
              "text-micro font-medium px-1.5 py-0.5 rounded border",
              isPositive
                ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
                : isNegative
                ? "bg-status-danger-surface text-status-danger-ink border-status-danger-rule"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(summary.netDeltaPercent).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-micro px-1.5 py-0.5 rounded-full bg-status-success-surface text-status-success-ink border border-status-success-rule font-medium">
          +{summary.newJoiners} joiners
        </span>
        <span className="inline-flex items-center gap-1 text-micro px-1.5 py-0.5 rounded-full bg-status-danger-surface text-status-danger-ink border border-status-danger-rule font-medium">
          -{summary.exited} exits
        </span>
        <span className="inline-flex items-center gap-1 text-micro px-1.5 py-0.5 rounded-full bg-status-warning-surface text-status-warning-ink border border-status-warning-rule font-medium">
          {summary.changedEmployees} changed
        </span>
      </div>
      {runId && (
        <Link
          href={`/payroll/runs/${runId}?tab=variance`}
          className="text-dense text-primary hover:underline"
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
          <p className="text-dense text-status-success-ink">No open exceptions</p>
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
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border shrink-0 ${
                      SEVERITY_COLORS[ex.severity]
                    }`}
                  >
                    {ex.severity}
                  </span>
                  <TruncatedText text={ex.message ?? ""} className="text-dense text-foreground flex-1" />
                </Link>
              );
            })}
          </div>
        )}
      </PanelCard>

      <PanelCard title="Payout Readiness">
        <div className="space-y-1 text-dense">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payout ready</span>
            <span
              className={cn(
                "font-medium",
                panels.payoutReadiness ? "text-status-success-ink" : "text-status-warning-ink",
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
                panels.statutoryReadiness.taxDeclarationsLocked ? "text-status-success-ink" : "text-status-warning-ink",
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
              className="block text-dense text-primary hover:underline pt-1"
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
          <p className="text-dense text-muted-foreground">No pending approvals</p>
        ) : (
          <div className="space-y-1">
            {panels.pendingApprovals.map((approval) => (
              <Link
                key={approval.id}
                href={runId ? `/payroll/runs/${runId}?tab=approvals` : "#"}
                className="flex items-center justify-between text-dense py-1 hover:bg-muted/20 -mx-1 px-1 rounded"
              >
                <span className="text-foreground">Stage {approval.stage}</span>
                <span className="text-status-warning-ink font-medium">{approval.status}</span>
              </Link>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard title="Upcoming Calendar" className="lg:col-span-2">
        {upcomingCalendarEvents.length === 0 ? (
          <p className="text-dense text-muted-foreground">No upcoming events</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
            {upcomingCalendarEvents.map((event) => {
              const eventDate = new Date(event.date);
              const isToday = event.date === new Date().toISOString().slice(0, 10);
              const isPast = eventDate < new Date();
              return (
                <div key={event.id} className="flex items-center gap-2 text-dense py-0.5">
                  <span
                    className={cn(
                      "font-mono tabular-nums shrink-0",
                      isPast ? "text-status-danger-ink" : isToday ? "text-status-warning-ink" : "text-muted-foreground",
                    )}
                  >
                    {event.date}
                  </span>
                  <TruncatedText text={event.label} className="text-foreground flex-1" />
                </div>
              );
            })}
          </div>
        )}
      </PanelCard>
    </div>
  );
}
