"use client";

import React from "react";
import { format } from "date-fns";
import { CalendarCheck, Clock3, BadgeCheck } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { formatDayCount } from "@/lib/format-utils";
import type { LeaveBalance } from "./leaves-shared";
import { useT } from "@/lib/i18n/i18n";

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

  const joined = joiningDate ? new Date(joiningDate) : null;
  const proratedMonths =
    joined && !Number.isNaN(joined.getTime()) &&
    joined.getFullYear() === new Date().getFullYear()
      ? 12 - joined.getMonth()
      : 12;

  const perType = balances
    .filter((b) => b.typeName)
    .map((b) => {
      const available = Number(b.balance ?? 0);
      if (b.daysPerYear === null || b.daysPerYear <= 0)
        return `${b.typeName} ${formatDayCount(available)}`;
      const entitled = Math.floor((proratedMonths / 12) * b.daysPerYear * 2) / 2;
      const used = Math.max(0, entitled - available);
      return `${b.typeName}: ${formatDayCount(entitled)} entitled − ${formatDayCount(used)} used = ${formatDayCount(available)}`;
    })
    .join(" · ");

  const prorated =
    proratedMonths < 12 && joined
      ? `Prorated from your joining date (${format(joined, "d MMM yyyy")}): ${proratedMonths} of 12 months`
      : "";
  const pendingNote = perType ? "Pending requests are deducted when approved" : "";

  return [perType, prorated, pendingNote].filter(Boolean).join(" — ") || undefined;
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
  const t = useT();
  return (
    <StatCardGrid cols={3}>
      <StatCard
        label={t("timeOff.availableDays")}
        value={formatDayCount(totalAvailable)}
        hint={availableHint}
        icon={CalendarCheck}
        color="green"
      />
      <StatCard
        label={t("timeOff.pendingRequests")}
        value={pendingCount}
        icon={Clock3}
        tone="amber"
      />
      <StatCard
        label={t("timeOff.approvedYtd")}
        value={formatDayCount(approvedDays)}
        icon={BadgeCheck}
        color="blue"
      />
    </StatCardGrid>
  );
});
