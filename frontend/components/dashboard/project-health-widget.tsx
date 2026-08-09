"use client";

import { WidgetCard } from "@/components/ui/widget-card";
import { Button } from "@/components/ui/button";
import { useExecutiveDashboard } from "@/hooks/api/dashboard";
import { useAccess } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { FolderKanban, RefreshCw } from "lucide-react";

export function BusinessPulseWidget() {
  const { data: accessData, isLoading: accessLoading } = useAccess();

  const hasCrmAccess =
    accessData?.isOrgOwner === true ||
    (accessData?.permissions.includes("crm:leads:view") ?? false);

  const { data, isLoading, error, refetch } = useExecutiveDashboard({
    enabled: hasCrmAccess,
  });

  if (!accessLoading && !hasCrmAccess) return null;

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
      isLoading={isLoading || accessLoading}
      loadingRows={2}
    >
      {error ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-sm text-destructive text-center">{getErrorMessage(error)}</p>
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-emerald-500/5 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {data?.conversionRate ?? 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Lead Conversion Rate
          </p>
        </div>
      )}
    </WidgetCard>
  );
}
