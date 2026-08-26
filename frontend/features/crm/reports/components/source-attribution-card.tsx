"use client";

import { useCallback, useMemo } from "react";
import { Activity } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { RecordList } from "@/features/renderer";
import { useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  SOURCE_ATTRIBUTION_LAYOUT,
  sourceAttributionFields,
} from "@/lib/renderer/crm/reports/source-attribution-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useLeadSourceReport } from "@/hooks/api/crm/leads";
import type { LeadSourceReport } from "../lib/types";

/**
 * Source attribution.
 *
 * The table is gone; `SOURCE_ATTRIBUTION_LAYOUT` describes it. Three defects
 * went with it. Money came from a `formatCurrency` that printed ₹ regardless of
 * the currency the organisation keeps its books in, and now comes from the
 * engine's `money` kind and `useOrgDisplay`. The conversion rate was coloured
 * from thresholds written into one cell renderer; the description now says which
 * direction is good news and the engine tones it. And `converted` was painted
 * green on every row that had any conversions at all, which is a count wearing a
 * verdict's colour.
 *
 * Whether the load failed is asked of the same query the reports page reads —
 * identical key, so it is answered from cache. The card previously had no error
 * branch and showed a failed request as an empty report.
 */

interface SourceAttributionCardProps {
  sourceReport: LeadSourceReport | undefined;
  isLoading: boolean;
}

export function SourceAttributionCard({
  sourceReport,
  isLoading,
}: SourceAttributionCardProps) {
  const layout = useTenantLayout(SOURCE_ATTRIBUTION_LAYOUT);
  const money = useOrgDisplay();
  const [density] = useDensity();
  const { isError, refetch, access} = useLeadSourceReport();

  const rows = useMemo(
    () => (sourceReport?.sources ?? []).map(sourceAttributionFields),
    [sourceReport],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Source Attribution
        </CardTitle>
      </CardHeader>
      {isLoading ? (
        <DataTableSkeleton rows={6} columns={layout.list.columns.length} className="border-0" />
      ) : isError ? (
        <ErrorState
          compact
          title="Couldn't load source attribution"
          description="The source report didn't load. Check your connection and try again."
          onRetry={handleRetry}
        />
      ) : rows.length === 0 ? (
        <EmptyState
            access={access}
          compact
          title="No leads carry a source yet"
          description="Set a source when a lead is created, or map one on import, and this report fills itself in."
        />
      ) : (
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={(row) => String(row.sourceKey)}
          density={density}
          money={money}
          minWidth="720px"
        />
      )}
    </Card>
  );
}
