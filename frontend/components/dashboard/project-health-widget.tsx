"use client";

import { WidgetCard } from "@/components/ui/widget-card";
import { useExecutiveDashboard } from "@/lib/api/hooks/dashboard";
import { useCan } from "@/lib/api/hooks/access";
import { FolderKanban } from "lucide-react";

export function BusinessPulseWidget() {
  const { data, isLoading, error } = useExecutiveDashboard();
  const hasCrmAccess = useCan("crm:leads:view");

  if (!hasCrmAccess) return null;

  return (
    <WidgetCard
      icon={FolderKanban}
      title="Business Pulse"
      link={{ href: "/crm/leads", label: "View pipeline", ariaLabel: "View CRM pipeline" }}
      isLoading={isLoading}
      error={error}
      loadingRows={2}
    >
      <div className="rounded-xl border border-border/60 bg-emerald-500/5 p-4 text-center">
        <p className="text-2xl font-bold tabular-nums text-emerald-600">
          {data?.conversionRate ?? 0}%
        </p>
        <p className="text-xs text-muted-foreground mt-1">Lead Conversion Rate</p>
      </div>
    </WidgetCard>
  );
}
