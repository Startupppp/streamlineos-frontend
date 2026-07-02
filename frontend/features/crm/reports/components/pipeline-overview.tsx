import { Users, Target, BarChart3, DollarSign } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { LeadStats } from "@/types/leads";
import type { DealStats } from "@/types/crm/deals";
import { formatCurrency } from "../lib/types";

interface PipelineOverviewProps {
  stats: LeadStats | undefined;
  dealStats: DealStats | undefined;
  periodLabel: string;
}

export function PipelineOverview({
  stats,
  dealStats,
  periodLabel,
}: PipelineOverviewProps) {
  return (
    <>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">
          Pipeline Overview
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">{periodLabel}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Leads"
          value={stats?.total ?? 0}
          icon={Users}
          color="blue"
          index={0}
          hint={`${stats?.thisMonth ?? 0} new this month`}
        />
        <StatCard
          label="Active Deals"
          value={dealStats?.active ?? 0}
          icon={Target}
          color="violet"
          index={1}
        />
        <StatCard
          label="Pipeline Value"
          value={dealStats ? formatCurrency(dealStats.pipelineValue) : "—"}
          icon={BarChart3}
          color="cyan"
          index={2}
        />
        <StatCard
          label="Won Revenue"
          value={dealStats ? formatCurrency(dealStats.wonValue) : "—"}
          icon={DollarSign}
          color="green"
          index={3}
        />
      </div>
    </>
  );
}
