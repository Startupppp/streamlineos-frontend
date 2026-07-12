"use client";

import { Receipt, Clock, CheckCircle2, XCircle } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { ExpenseStats } from "@/types/hr/expenses";

interface ExpenseStatsProps {
  stats: ExpenseStats | null | undefined;
  isLoading?: boolean;
}

export function ExpenseStatsGrid({ stats, isLoading }: ExpenseStatsProps) {
  return (
    <StatCardGrid cols={4} className="mb-4">
      <StatCard
        label="Submitted"
        value={stats?.pendingCount ?? 0}
        icon={Receipt}
        tone="blue"
        isLoading={isLoading}
        hint="Awaiting review"
      />
      <StatCard
        label="Awaiting Reimbursement"
        value={stats ? `₹${Number(stats.approvedAmount).toLocaleString("en-IN")}` : "—"}
        icon={Clock}
        tone="amber"
        isLoading={isLoading}
        hint="Approved, not paid"
      />
      <StatCard
        label="Reimbursed This Month"
        value={stats ? `₹${Number(stats.paidAmount).toLocaleString("en-IN")}` : "—"}
        icon={CheckCircle2}
        tone="emerald"
        isLoading={isLoading}
      />
      <StatCard
        label="Rejected"
        value={stats?.rejectedCount ?? 0}
        icon={XCircle}
        tone="red"
        isLoading={isLoading}
      />
    </StatCardGrid>
  );
}
