"use client";

import React from "react";
import { format } from "date-fns";
import { CalendarCheck, Clock3, BadgeCheck } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { formatDayCount } from "@/lib/format-utils";
import type { LeaveBalance } from "./leaves-shared";

/**
 * V-045. The no-policy copy keys on whether the org has *configured* a leave
 * type, never on whether the viewer holds balance rows. A configured 12-day
 * policy nobody has used yet also has zero stored balances, and that is exactly
 * the org this copy used to lie to.
 * PROVISIONAL: `noPolicyConfigured` comes from /me/time-off; until the backend
 * half lands the caller falls back to "no configured types".
 */
export function buildAvailableHint(
  balances: LeaveBalance[],
  joiningDate: string | null,
  noPolicyConfigured = false,
): string | undefined {
  if (noPolicyConfigured)
    return "No leave policy is set up yet, so nothing has accrued — an HR admin can add leave types under Leave settings.";

  const perType = balances
    .filter((b) => b.typeName)
    .map((b) => `${b.typeName} ${formatDayCount(Number(b.balance ?? 0))}`)
    .join(" · ");

  const joined = joiningDate ? new Date(joiningDate) : null;
  const prorated =
    joined && !Number.isNaN(joined.getTime()) &&
    joined.getFullYear() === new Date().getFullYear()
      ? `Prorated from your joining date (${format(joined, "d MMM yyyy")}): ${12 - joined.getMonth()} of 12 months`
      : "";

  return [perType, prorated].filter(Boolean).join(" — ") || undefined;
}

export const LeavesSummaryStrip = React.memo(function LeavesSummaryStrip({
  totalAvailable,
  availableHint,
  pendingCount,
  approvedDays,
}: {
  totalAvailable: number;
  availableHint?: string;
  pendingCount: number;
  approvedDays: number;
}) {
  return (
    <StatCardGrid cols={3}>
      <StatCard
        label="Available Days"
        value={formatDayCount(totalAvailable)}
        hint={availableHint}
        icon={CalendarCheck}
        color="green"
      />
      <StatCard
        label="Pending Requests"
        value={pendingCount}
        icon={Clock3}
        tone="amber"
      />
      <StatCard
        label="Approved (YTD)"
        value={formatDayCount(approvedDays)}
        icon={BadgeCheck}
        color="blue"
      />
    </StatCardGrid>
  );
});
