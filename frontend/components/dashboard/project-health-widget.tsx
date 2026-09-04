"use client";

import { WidgetCard } from "@/components/ui/widget-card";
import { Button } from "@/components/ui/button";
import { useExecutiveDashboard } from "@/hooks/api/dashboard";
import { useAccess } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { FolderKanban, RefreshCw } from "lucide-react";

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
    >
      {error ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <p role="alert" className="text-sm text-destructive text-center">
            {getErrorMessage(error)}
          </p>
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-status-success-surface p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-status-success-ink">
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
