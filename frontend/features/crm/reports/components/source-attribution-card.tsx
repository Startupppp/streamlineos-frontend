"use client";

import { useCallback, useMemo } from "react";
import { useCanState } from "@/hooks/api/access";
import { Activity } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { RecordList } from "@/components/renderer";
import { useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  SOURCE_ATTRIBUTION_LAYOUT,
  sourceAttributionFields,
} from "@/lib/renderer/crm/reports/source-attribution-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useLeadSourceReport } from "@/hooks/api/crm/leads";
import type { LeadSourceReport } from "../lib/types";


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
  const { isError, refetch, access } = useLeadSourceReport();

  const rows = useMemo(
    () => (sourceReport?.sources ?? []).map(sourceAttributionFields),
    [sourceReport],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (useCanState("crm:leads:view") === "denied")
    return <NoPermissionState permission="crm:leads:view" />;

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
