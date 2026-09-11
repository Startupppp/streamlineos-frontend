import { Users, Target, BarChart3, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { LeadStats } from "@/types/leads";
import type { DealStats } from "@/types/crm/deals";
import { formatCompactInr } from "../lib/types";

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
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <h2 className="text-sm font-semibold text-foreground">
          Pipeline Overview
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">{periodLabel}</p>
      </CardHeader>
      <CardContent>
        <StatCardGrid cols={4}>
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
            color="blue"
            index={1}
          />
          <StatCard
            label="Pipeline Value"
            value={dealStats ? formatCompactInr(dealStats.pipelineValue) : "—"}
            icon={BarChart3}
            color="blue"
            index={2}
          />
          <StatCard
            label="Won Revenue"
            value={dealStats ? formatCompactInr(dealStats.wonValue) : "—"}
            icon={DollarSign}
            color="green"
            index={3}
          />
        </StatCardGrid>
      </CardContent>
    </Card>
  );
}
