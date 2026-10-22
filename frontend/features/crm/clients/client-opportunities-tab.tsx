"use client";

import { useCallback } from "react";
import { useCanState } from "@/hooks/api/access";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { RecordList, asRecordValues } from "@/components/renderer";
import { useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { CLIENT_OPPORTUNITY_LAYOUT } from "@/lib/renderer/crm/client-opportunity-layout";
import { useClientOpportunities } from "@/hooks/api/crm/clients";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { getErrorMessage } from "@/lib/get-error-message";

const PAGE_SIZE = 20;

export function ClientOpportunitiesTab({ clientId }: { clientId: number }) {
  const layout = useTenantLayout(CLIENT_OPPORTUNITY_LAYOUT);
  const money = useOrgDisplay();
  const [density] = useDensity();

  const { data, isLoading, isError, error, refetch } = useClientOpportunities(clientId);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (useCanState("crm:clients:read") === "denied")
    return <NoPermissionState permission="crm:clients:read" />;

  if (isLoading)
    return <DataTableSkeleton rows={6} columns={layout.list.columns.length} />;

  if (isError)
    return (
      <ErrorState
        compact
        title="Couldn't load opportunities"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );

  const opportunities = data ?? [];

  if (opportunities.length === 0)
    return (
      <EmptyState
        compact
        className="py-10"
        title="No opportunities logged"
        description="Track an upsell or cross-sell here so renewals and expansion don't live only in someone's head."
      />
    );

  return (
    <RecordList
      layout={layout}
      rows={asRecordValues(opportunities)}
      getRowKey={(row) => String(row.id)}
      density={density}
      money={money}
      minWidth="720px"
      pagination={{ pageSize: PAGE_SIZE }}
    />
  );
}
