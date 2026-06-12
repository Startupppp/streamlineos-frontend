"use client";

import { WidgetCard } from "@/components/ui/widget-card";
import { useExecutiveDashboard } from "@/lib/api/hooks/dashboard";
import { FolderKanban } from "lucide-react";

export function BusinessPulseWidget() {
  const { data, isLoading, error } = useExecutiveDashboard();

  return (
    <WidgetCard
      icon={FolderKanban}
      title="Business Pulse"
      link={{ href: "/projects", label: "View all", ariaLabel: "View all projects" }}
      isLoading={isLoading}
      error={error}
      loadingRows={2}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/60 bg-blue-500/5 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-blue-600">
            {data?.activeProjects ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Active Projects</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-emerald-500/5 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-600">
            {data?.conversionRate ?? 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Lead Conversion</p>
        </div>
      </div>
    </WidgetCard>
  );
}
