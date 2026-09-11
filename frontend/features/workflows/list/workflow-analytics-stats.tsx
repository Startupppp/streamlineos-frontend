"use client";

import { Activity, CheckCircle2, Clock, GitBranch } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { WorkflowAnalytics } from "@/hooks/api/workflows";

interface WorkflowAnalyticsStatsProps {
  analytics: WorkflowAnalytics | undefined;
  isLoading: boolean;
}

export function WorkflowAnalyticsStats({
  analytics,
  isLoading,
}: WorkflowAnalyticsStatsProps) {
  return (
    <StatCardGrid cols={4}>
      <StatCard
        label="Total Workflows"
        value={analytics?.totalWorkflows ?? 0}
        icon={GitBranch}
        tone="violet"
        isLoading={isLoading}
      />
      <StatCard
        label="Active Workflows"
        value={analytics?.activeWorkflows ?? 0}
        icon={CheckCircle2}
        tone="emerald"
        isLoading={isLoading}
      />
      <StatCard
        label="Total Executions"
        value={analytics?.totalExecutions ?? 0}
        icon={Activity}
        tone="blue"
        isLoading={isLoading}
      />
      <StatCard
        label="Pending Approvals"
        value={analytics?.pendingApprovals ?? 0}
        icon={Clock}
        tone="amber"
        isLoading={isLoading}
      />
    </StatCardGrid>
  );
}
