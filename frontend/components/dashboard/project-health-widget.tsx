"use client";

import { WidgetCard } from "@/components/ui/widget-card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useExecutiveDashboard } from "@/hooks/api/dashboard";
import { useAccess } from "@/hooks/api/access";
import { FolderKanban, Target, IndianRupee, TrendingUp, Zap } from "lucide-react";

/**
 * The CRM check gates the MOUNT, not an `enabled` flag, and that is the whole
 * point of the split. `ExecutiveKpiWidget` observes the same
 * `queryKeys.dashboard.executive()` key without a CRM condition, and TanStack
 * enables a query when ANY observer enables it — so an `enabled: hasCrmAccess`
 * on this hook was satisfied by the sibling and never suppressed a single
 * request. A permission that decides whether a widget exists has to decide
 * whether its hook runs at all.
 */
export function BusinessPulseWidget() {
  const { data: accessData, isLoading: accessLoading } = useAccess();

  const hasCrmAccess =
    accessData?.isOrgOwner === true ||
    (accessData ? "crm:leads:view" in accessData.scopes : false);

  if (accessLoading)
    return <WidgetCard icon={FolderKanban} title="Business Pulse" isLoading loadingRows={2} />;
  if (!hasCrmAccess) return null;

  return <BusinessPulseCard />;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

function BusinessPulseCard() {
  const { data, isLoading, error, refetch } = useExecutiveDashboard();

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
