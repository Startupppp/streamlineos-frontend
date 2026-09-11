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

/**
 * The upsell and cross-sell opportunities on one client.
 *
 * The columns, their labels, the stage tones and the mobile card come from
 * `CLIENT_OPPORTUNITY_LAYOUT`. What this replaces is a hand-written column list
 * carrying two label maps and a badge-class map of its own, plus an
 * `en-IN`/`INR` money formatter that showed rupees to every tenant whatever
 * currency they trade in — `money` now renders in the organisation's own.
 *
 * It also had no loading signal: the table's skeleton covered the rows, but a
 * failed load fell through to the empty state and read as "no opportunities
 * logged". A failure dressed as emptiness is the one thing principle 2 rules
 * out, so the error branch is tested first and says the load failed.
 */
export function ClientOpportunitiesTab({ clientId }: { clientId: number }) {
  const layout = useTenantLayout(CLIENT_OPPORTUNITY_LAYOUT);
  const money = useOrgDisplay();
  const [density] = useDensity();

  const { data, isLoading, isError, error, refetch } = useClientOpportunities(clientId);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
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
