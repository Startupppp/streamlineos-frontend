"use client";

import { WidgetCard } from "@/components/ui/widget-card";
import { WidgetSkeleton } from "@/components/dashboard/widget-skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useCrmPulse } from "@/hooks/api/dashboard";
import { useCanState, useModuleEnabled } from "@/hooks/api/access";
import { FolderKanban, Target, IndianRupee, TrendingUp, Zap } from "lucide-react";

export function BusinessPulseWidget() {
  const crmState = useCanState("crm:leads:view");
  const crmEnabled = useModuleEnabled("crm");

  if (crmState === "loading")
    return (
      <WidgetSkeleton variant="pulse" className="h-auto" />
    );
  if (crmState === "denied" || !crmEnabled)
    return <NoPermissionState permission="crm:leads:view" compact />;

  return <BusinessPulseCard />;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

function BusinessPulseCard() {
  const { data, isLoading, error, refetch } = useCrmPulse();

  const handleRetry = () => void refetch();

  if (isLoading && !data && !error) {
    return <WidgetSkeleton variant="pulse" className="h-auto" />;
  }

  return (
    <WidgetCard
      className="h-auto"
      icon={FolderKanban}
      title="Business Pulse"
      link={
        error
          ? undefined
          : { href: "/crm/leads", label: "View pipeline", ariaLabel: "View CRM pipeline" }
      }
      error={error}
      onRetry={handleRetry}
      contentClassName="flex-none py-3"
    >
      <StatCardGrid cols={2}>
        <StatCard
          label="Conversion Rate"
          value={`${data?.conversionRate ?? 0}%`}
          icon={Target}
          color="purple"
          index={0}
        />
        {data?.mrr !== undefined && (
          <StatCard
            label="MRR (Won)"
            value={fmt(data.mrr)}
            icon={IndianRupee}
            color="gold"
            index={1}
          />
        )}
        {data?.pipelineValue !== undefined && (
          <StatCard
            label="Pipeline Value"
            value={fmt(data.pipelineValue)}
            icon={TrendingUp}
            color="blue"
            index={2}
          />
        )}
        {data?.newLeadsThisWeek !== undefined && (
          <StatCard
            label="New Leads This Week"
            value={data.newLeadsThisWeek}
            icon={Zap}
            color="cyan"
            index={3}
          />
        )}
      </StatCardGrid>
    </WidgetCard>
  );
}
