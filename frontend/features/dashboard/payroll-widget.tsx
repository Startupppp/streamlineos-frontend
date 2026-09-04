"use client";

import { format } from "date-fns";
import { Wallet } from "lucide-react";
import { WidgetCard } from "@/components/ui/widget-card";
import { useEssOverview } from "@/hooks/api/payroll/ess";
import { useDashboardAccess } from "@/features/dashboard/use-dashboard-access";

function PayrollSelfCard() {
  const { data, isLoading, error, refetch } = useEssOverview();
  const handleRetry = () => void refetch();

  return (
    <WidgetCard
      icon={Wallet}
      iconClassName="text-primary"
      title="My Payroll"
      badge={data?.latestPayslip ? data.latestPayslip.month : undefined}
      link={{ href: "/me/pay", label: "View" }}
      isLoading={isLoading}
      error={error}
      onRetry={handleRetry}
      loadingRows={2}
      isEmpty={!data}
      empty={<p className="text-xs text-muted-foreground text-center py-6">No data.</p>}
    >
      <div className="space-y-2.5">
        {data?.latestPayslip ? (
          <div className="rounded-lg border border-border/60 p-2.5">
            <p className="text-micro text-muted-foreground">Latest payslip</p>
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
        {data?.nextPayDate && (
          <div className="flex items-center justify-between text-dense">
            <span className="text-muted-foreground">Next payroll</span>
            <span className="font-medium">
              {format(new Date(data.nextPayDate.date), "MMM d, yyyy")}
            </span>
          </div>
        )}
        {data && Number(data.pendingReimbursementsCount) > 0 && (
          <div className="flex items-center justify-between text-dense">
            <span className="text-muted-foreground">Pending reimbursements</span>
            <span className="font-medium">{data.pendingReimbursementsCount}</span>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

export function PayrollWidget() {
  const { payrollEnabled, canViewPayrollSelf } = useDashboardAccess();

  if (!payrollEnabled) return null;
  if (canViewPayrollSelf) return <PayrollSelfCard />;
  return null;
}
