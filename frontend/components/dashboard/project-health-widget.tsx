"use client";

import { WidgetCard } from "@/components/ui/widget-card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useCrmPulse } from "@/hooks/api/dashboard";
import { useCanState, useModuleEnabled } from "@/hooks/api/access";
import { FolderKanban, Target, IndianRupee, TrendingUp, Zap } from "lucide-react";

export function BusinessPulseWidget() {
  const crmState = useCanState("crm:leads:view");
  const crmEnabled = useModuleEnabled("crm");

  if (crmState === "loading")
    return <WidgetCard icon={FolderKanban} title="Business Pulse" isLoading loadingRows={2} />;
  // An HR workspace owner without CRM should not see an Access Restricted card
  // demanding Crm › Leads › View. Hide the widget instead.
  if (crmState === "denied" || !crmEnabled) return null;

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

  return (
    <WidgetCard
      icon={FolderKanban}
      title="Business Pulse"
      link={
        error
          ? undefined
          : { href: "/crm/leads", label: "View pipeline", ariaLabel: "View CRM pipeline" }
      }
      isLoading={isLoading}
      loadingRows={2}
      error={error}
      onRetry={handleRetry}
    >
      <StatCardGrid cols={2}>
        <StatCard
          label="Conversion Rate"
          value={`${data?.conversionRate ?? 0}%`}
          icon={Target}
          color="purple"
          index={0}
          href="/crm/leads"
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
            href="/crm/deals"
          />
        )}
        {data?.newLeadsThisWeek !== undefined && (
          <StatCard
            label="New Leads This Week"
            value={data.newLeadsThisWeek}
            icon={Zap}
            color="cyan"
            index={3}
            href="/crm/leads"
          />
        )}
      </StatCardGrid>
    </WidgetCard>
  );
}
