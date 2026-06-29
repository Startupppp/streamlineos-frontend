"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { WidgetCard } from "@/components/ui/widget-card";
import { usePersonalDashboard } from "@/hooks/api/dashboard";
import { Umbrella } from "lucide-react";

export function LeaveBalanceWidget() {
  const { data, isLoading, error } = usePersonalDashboard();
  const balances = data?.leaveBalance ?? [];

  return (
    <WidgetCard
      icon={Umbrella}
      title="Leave Balance"
      link={{ href: "/hr/leaves", ariaLabel: "View leave details" }}
      isLoading={isLoading}
      error={error}
      isEmpty={!balances.length}
      empty={
        <EmptyState
          illustration={<EmptyCalendarIllustration className="h-20 w-20" />}
          title="No leave data"
          description="No leave balances set up yet."
          compact
        />
      }
    >
      <ul className="space-y-2">
        {balances.map((b) => {
          const pct =
            b.total > 0 ? Math.round((b.remaining / b.total) * 100) : 0;
          return (
            <li key={b.type} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium truncate">{b.type}</span>
                <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                  {b.remaining} / {b.total} days
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={b.remaining}
                  aria-valuemin={0}
                  aria-valuemax={b.total}
                  aria-label={`${b.type}: ${b.remaining} of ${b.total} days remaining`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
