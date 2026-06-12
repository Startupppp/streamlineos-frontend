"use client";

import { WidgetCard } from "@/components/ui/widget-card";
import { useExecutiveDashboard } from "@/lib/api/hooks/dashboard";
import { FolderKanban } from "lucide-react";

export function ProjectHealthWidget() {
  const { data, isLoading, error } = useExecutiveDashboard();

  return (
    <WidgetCard
      icon={FolderKanban}
      title="Project Health"
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
        <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">
            {data?.newLeadsThisWeek ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">New Leads (7d)</p>
        </div>
      </div>
    </WidgetCard>
  );
}
