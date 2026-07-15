"use client";

import { memo } from "react";
import { Clock, AlertCircle, ShieldAlert, TrendingDown } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { CrmInboxCounts } from "@/types/crm";

interface InboxStatCardsProps {
  counts: CrmInboxCounts | undefined;
  isLoading: boolean;
}

export const InboxStatCards = memo(function InboxStatCards({ counts, isLoading }: InboxStatCardsProps) {
  return (
    <StatCardGrid cols={4}>
      <StatCard
        label="Due Today"
        value={counts?.dueTasks ?? 0}
        icon={Clock}
        tone="blue"
        isLoading={isLoading}
      />
      <StatCard
        label="Overdue"
        value={counts?.overdueTasks ?? 0}
        icon={AlertCircle}
        tone="red"
        isLoading={isLoading}
      />
      <StatCard
        label="SLA Risk"
        value={counts?.slaRisk ?? 0}
        icon={ShieldAlert}
        tone="amber"
        isLoading={isLoading}
      />
      <StatCard
        label="Stuck Deals"
        value={counts?.stuckDeals ?? 0}
        icon={TrendingDown}
        tone="default"
        isLoading={isLoading}
      />
    </StatCardGrid>
  );
});
