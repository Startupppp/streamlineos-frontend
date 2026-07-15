"use client";

import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  BarChart3,
} from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { formatINRCompact } from "@/lib/format-utils";
import type { ExpensePageData } from "@/types/hr/expenses";

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
    <StatCardGrid cols={4}>
      <StatCard
        label="Pending Approval"
        value={pendingCount}
        icon={AlertCircle}
        tone="amber"
      />
      <StatCard
        label="Approved (Month)"
        value={formatINRCompact(stats?.approvedAmount || 0)}
        icon={CheckCircle2}
        tone="emerald"
      />
      <StatCard
        label="Rejected (Month)"
        value={formatINRCompact(stats?.rejectedAmount || 0)}
        icon={XCircle}
        tone="red"
      />
      <StatCard
        label="Total Claimed (Month)"
        value={formatINRCompact(totalClaimed)}
        icon={BarChart3}
        tone="blue"
      />
    </StatCardGrid>
  );
}

interface MemberExpenseStatsProps {
  stats: ExpensePageData["stats"] | null | undefined;
}

export function MemberExpenseStats({ stats }: MemberExpenseStatsProps) {
  return (
    <StatCardGrid cols={3}>
      <StatCard
        label="Total Reimbursed (YTD)"
        value={formatINRCompact((stats?.approvedAmount || 0) + (stats?.paidAmount || 0))}
        icon={DollarSign}
        tone="emerald"
      />
      <StatCard
        label="Pending Approval"
        value={formatINRCompact(stats?.pendingAmount || 0)}
        icon={Clock}
        tone="amber"
      />
      <StatCard
        label="Rejected (30d)"
        value={formatINRCompact(stats?.rejectedAmount || 0)}
        icon={XCircle}
        tone="red"
      />
    </StatCardGrid>
  );
}
