"use client";

import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { useExecutiveDashboard } from "@/hooks/api/dashboard";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { IndianRupee, TrendingUp, Target, Briefcase, RefreshCw } from "lucide-react";

export function ExecutiveKpiWidget() {
  const { data, isLoading, error, refetch } = useExecutiveDashboard();
  const hasCrmAccess = useCan("crm:leads:view");

  const handleRetry = () => void refetch();

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
        <p className="flex-1 text-sm text-destructive">{getErrorMessage(error)}</p>
        <Button variant="ghost" size="sm" onClick={handleRetry} className="shrink-0">
          <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  const skeletonCount = hasCrmAccess ? 4 : 2;

  if (isLoading || !data) {
    return <StatCardGridSkeleton cols={4} count={skeletonCount} />;
  }

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `₹${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `₹${(n / 1_000).toFixed(0)}K`
        : `₹${n}`;

  return (
    <StatCardGrid cols={4}>
      <StatCard
        label="Open Roles"
        value={data.openRoles}
        icon={Briefcase}
        color="gold"
        index={0}
      />
      <StatCard
        label="Conversion Rate"
        value={`${data.conversionRate}%`}
        icon={Target}
        color="purple"
        index={1}
        href={hasCrmAccess ? "/crm/leads" : undefined}
      />
      {hasCrmAccess && (
        <>
          <StatCard
            label="MRR (Won)"
            value={fmt(data.mrr)}
            icon={IndianRupee}
            color="gold"
            index={2}
          />
          <StatCard
            label="Pipeline Value"
            value={fmt(data.pipelineValue)}
            icon={TrendingUp}
            color="blue"
            index={3}
            href="/crm/deals"
          />
        </>
      )}
    </StatCardGrid>
  );
}
