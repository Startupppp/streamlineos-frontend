"use client";

import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { useExecutiveDashboard } from "@/hooks/api/dashboard";
import { getErrorMessage } from "@/lib/get-error-message";
import { Users, Briefcase, Folder, RefreshCw } from "lucide-react";

export function ExecutiveKpiWidget() {
  const { data, isLoading, error, refetch } = useExecutiveDashboard();

  const handleRetry = () => void refetch();

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
        <p role="alert" className="flex-1 text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
        <Button variant="ghost" size="sm" onClick={handleRetry} className="shrink-0">
          <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return <StatCardGridSkeleton cols={4} count={3} />;
  }

  return (
    <StatCardGrid cols={4}>
      <StatCard
        label="Headcount"
        value={data.headcount}
        icon={Users}
        color="blue"
        index={0}
      />
      <StatCard
        label="Open Roles"
        value={data.openRoles}
        icon={Briefcase}
        color="gold"
        index={1}
      />
      <StatCard
        label="Active Projects"
        value={data.activeProjects}
        icon={Folder}
        color="purple"
        index={2}
      />
    </StatCardGrid>
  );
}
