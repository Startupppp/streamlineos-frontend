"use client";

import { Button } from "@/components/ui/button";
import { WidgetCard } from "@/components/ui/widget-card";
import { useManagerDashboard } from "@/lib/api/hooks/dashboard";
import { Bell, CalendarCheck, Receipt, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface ApprovalRowProps {
  href: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
}

function ApprovalRow({ href, label, count, icon: Icon }: ApprovalRowProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/50 hover:border-blue-400 transition-colors"
      aria-label={`${count} pending ${label.toLowerCase()}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm">{label}</span>
      </div>
      {count > 0 && (
        <span className="inline-flex items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-semibold min-w-[1.5rem] px-1.5 py-0.5 tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}

export function PendingApprovalsWidget() {
  const { data, isLoading, error } = useManagerDashboard();
  const allClear =
    !data ||
    (data.pendingLeaveApprovals === 0 && data.pendingExpenseApprovals === 0);

  return (
    <WidgetCard
      icon={Bell}
      title="Pending Approvals"
      isLoading={isLoading}
      error={error}
      loadingRows={2}
    >
      <div className="space-y-2">
        {allClear ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2
              className="h-4 w-4 text-emerald-500 shrink-0"
              aria-hidden="true"
            />
            All caught up!
          </div>
        ) : (
          <>
            <ApprovalRow
              href="/hr/leaves"
              label="Leave Requests"
              count={data?.pendingLeaveApprovals ?? 0}
              icon={CalendarCheck}
            />
            <ApprovalRow
              href="/hr/expenses"
              label="Expense Reports"
              count={data?.pendingExpenseApprovals ?? 0}
              icon={Receipt}
            />
          </>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 text-xs h-8" asChild>
            <Link href="/hr/leaves" aria-label="Review leave requests">
              Review Leaves
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs h-8" asChild>
            <Link href="/hr/expenses" aria-label="Review expense reports">
              Review Expenses
            </Link>
          </Button>
        </div>
      </div>
    </WidgetCard>
  );
}
