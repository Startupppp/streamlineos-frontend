"use client";

import { Clock, Users, AlertTriangle, CheckCircle2, Timer } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { PayrollPeriodTotals } from "./types";

interface PayrollStatsProps {
  totals: PayrollPeriodTotals | undefined;
  isLoading: boolean;
}

export function PayrollStats({ totals, isLoading }: PayrollStatsProps) {
  return (
    <StatCardGrid cols={5}>
      <StatCard
        label="Payable Hours"
        value={isLoading ? "-" : (totals?.payableHours ?? 0).toFixed(1)}
        icon={Clock}
        tone="blue"
        isLoading={isLoading}
      />
      <StatCard
        label="Overtime"
        value={isLoading ? "-" : (totals?.overtimeHours ?? 0).toFixed(1)}
        icon={Timer}
        tone="amber"
        isLoading={isLoading}
      />
      <StatCard
        label="People"
        value={isLoading ? "-" : (totals?.userCount ?? 0)}
        icon={Users}
        tone="default"
        isLoading={isLoading}
      />
      <StatCard
        label="Pending Approvals"
        value={isLoading ? "-" : (totals?.pendingApprovalCount ?? 0)}
        icon={AlertTriangle}
        tone="amber"
        hint={totals ? `${totals.pendingApprovalHours.toFixed(1)} h` : undefined}
        isLoading={isLoading}
      />
      <StatCard
        label="Exported Hours"
        value={isLoading ? "-" : (totals?.exportedHours ?? 0).toFixed(1)}
        icon={CheckCircle2}
        tone="emerald"
        isLoading={isLoading}
      />
    </StatCardGrid>
  );
}
