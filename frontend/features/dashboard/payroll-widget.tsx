"use client";

import { format } from "date-fns";
import { Wallet, AlertTriangle, Clock3 } from "lucide-react";
import { WidgetCard } from "@/components/ui/widget-card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useEssOverview } from "@/hooks/api/payroll/ess";
import { useCommandCenter } from "@/hooks/api/payroll/command-center";
import { useDashboardAccess } from "@/features/dashboard/use-dashboard-access";

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function PayrollSelfCard() {
  const { data, isLoading } = useEssOverview();

  return (
    <WidgetCard
      icon={Wallet}
      iconClassName="text-primary"
      title="My Payroll"
      badge={data?.latestPayslip ? data.latestPayslip.month : undefined}
      link={{ href: "/payroll/me", label: "View" }}
      isLoading={isLoading}
      loadingRows={2}
      isEmpty={!data}
      empty={<p className="text-xs text-muted-foreground text-center py-6">No data.</p>}
    >
      <div className="space-y-2.5">
        {data?.latestPayslip ? (
          <div className="rounded-lg border border-border/60 p-2.5">
            <p className="text-[10px] text-muted-foreground">Latest payslip</p>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-sm font-medium">{data.latestPayslip.month}</span>
              <span className="text-lg font-bold tabular-nums">
                ₹{data.latestPayslip.net ?? "—"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">
            No payslip published yet.
          </p>
        )}
        {data && Number(data.pendingReimbursementsCount) > 0 && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Pending reimbursements</span>
            <span className="font-medium">{data.pendingReimbursementsCount}</span>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

function PayrollAdminCard() {
  const month = format(new Date(), "yyyy-MM");
  const { data, isLoading } = useCommandCenter(month);
  const nextEvent = data?.upcomingCalendarEvents[0] ?? null;

  return (
    <WidgetCard
      icon={Wallet}
      iconClassName="text-primary"
      title="Payroll"
      badge={data?.header.status ? toTitleCase(data.header.status) : undefined}
      link={{ href: "/payroll/runs", label: "View" }}
      isLoading={isLoading}
      loadingRows={2}
      isEmpty={!data}
      empty={<p className="text-xs text-muted-foreground text-center py-6">No data.</p>}
    >
      <div className="space-y-2.5">
        <StatCardGrid cols={3}>
          <StatCard
            label="Blockers"
            value={data?.header.exceptionCounts.BLOCKER ?? 0}
            icon={AlertTriangle}
            tone="red"
          />
          <StatCard
            label="Warnings"
            value={data?.header.exceptionCounts.WARNING ?? 0}
            icon={AlertTriangle}
            tone="amber"
          />
          <StatCard
            label="Approvals"
            value={data?.panels.pendingApprovals.length ?? 0}
            icon={Clock3}
            tone="default"
          />
        </StatCardGrid>
        {nextEvent && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Next: {nextEvent.label}</span>
            <span className="font-medium">
              {format(new Date(nextEvent.date), "MMM d")}
            </span>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

export function PayrollWidget() {
  const { payrollEnabled, canViewPayrollSelf, canViewPayrollAdmin } = useDashboardAccess();

  if (!payrollEnabled) return null;
  if (canViewPayrollAdmin) return <PayrollAdminCard />;
  if (canViewPayrollSelf) return <PayrollSelfCard />;
  return null;
}
