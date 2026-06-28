"use client";

import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINRCompact } from "@/lib/format-utils";
import type { ExpensePageData } from "@/types/hr/expenses";

interface StatItemProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}

function StatItem({ label, value, icon: Icon, accent, iconBg, iconColor, valueColor }: StatItemProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4", accent)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
            <p className={cn("text-3xl font-bold tabular-nums mt-1.5 leading-none", valueColor)}>
              {value}
            </p>
          </div>
          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("h-3.5 w-3.5", iconColor)} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdminExpenseStatsProps {
  stats: ExpensePageData["stats"] | null | undefined;
  pendingCount: number;
}

export function AdminExpenseStats({ stats, pendingCount }: AdminExpenseStatsProps) {
  const totalClaimed =
    (stats?.approvedAmount || 0) +
    (stats?.pendingAmount || 0) +
    (stats?.rejectedAmount || 0) +
    (stats?.paidAmount || 0);

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatItem
        label="Pending Approval"
        value={pendingCount}
        icon={AlertCircle}
        accent="border-l-amber-400"
        iconBg="bg-amber-100 dark:bg-amber-950/40"
        iconColor="text-amber-600 dark:text-amber-400"
        valueColor="text-amber-700 dark:text-amber-400"
      />
      <StatItem
        label="Approved (Month)"
        value={formatINRCompact(stats?.approvedAmount || 0)}
        icon={CheckCircle2}
        accent="border-l-emerald-400"
        iconBg="bg-emerald-100 dark:bg-emerald-950/40"
        iconColor="text-emerald-600 dark:text-emerald-400"
        valueColor="text-emerald-700 dark:text-emerald-400"
      />
      <StatItem
        label="Rejected (Month)"
        value={formatINRCompact(stats?.rejectedAmount || 0)}
        icon={XCircle}
        accent="border-l-rose-400"
        iconBg="bg-rose-100 dark:bg-rose-950/40"
        iconColor="text-rose-600 dark:text-rose-400"
        valueColor="text-rose-700 dark:text-rose-400"
      />
      <StatItem
        label="Total Claimed (Month)"
        value={formatINRCompact(totalClaimed)}
        icon={BarChart3}
        accent="border-l-blue-400"
        iconBg="bg-blue-100 dark:bg-blue-950/40"
        iconColor="text-blue-600 dark:text-blue-400"
        valueColor="text-blue-700 dark:text-blue-400"
      />
    </div>
  );
}

interface MemberExpenseStatsProps {
  stats: ExpensePageData["stats"] | null | undefined;
}

export function MemberExpenseStats({ stats }: MemberExpenseStatsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <StatItem
        label="Total Reimbursed (YTD)"
        value={formatINRCompact((stats?.approvedAmount || 0) + (stats?.paidAmount || 0))}
        icon={DollarSign}
        accent="border-l-emerald-400"
        iconBg="bg-emerald-100 dark:bg-emerald-950/40"
        iconColor="text-emerald-600 dark:text-emerald-400"
        valueColor="text-emerald-700 dark:text-emerald-400"
      />
      <StatItem
        label="Pending Approval"
        value={formatINRCompact(stats?.pendingAmount || 0)}
        icon={Clock}
        accent="border-l-amber-400"
        iconBg="bg-amber-100 dark:bg-amber-950/40"
        iconColor="text-amber-600 dark:text-amber-400"
        valueColor="text-amber-700 dark:text-amber-400"
      />
      <StatItem
        label="Rejected (30d)"
        value={formatINRCompact(stats?.rejectedAmount || 0)}
        icon={XCircle}
        accent="border-l-rose-400"
        iconBg="bg-rose-100 dark:bg-rose-950/40"
        iconColor="text-rose-600 dark:text-rose-400"
        valueColor="text-rose-700 dark:text-rose-400"
      />
    </div>
  );
}
