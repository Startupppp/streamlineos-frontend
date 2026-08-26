"use client";

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { useClientOpportunities } from "@/hooks/api/crm/clients";
import { formatAmount, formatDate } from "./utils";
import type { ClientOpportunity } from "@/types/crm";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";

const OPP_STAGE_LABELS: Record<ClientOpportunity["stage"], string> = {
  identified: "Identified",
  proposed: "Proposed",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

const OPP_STAGE_BADGE_CLASSES: Record<ClientOpportunity["stage"], string> = {
  identified: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  proposed: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  negotiating: "bg-muted text-muted-foreground border-border",
  won: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  lost: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

const columns: DataTableColumn<ClientOpportunity>[] = [
  {
    key: "title",
    header: "Title",
    className: TABLE_TITLE_CELL,
    cell: (row) => (
      <TruncatedText text={row.title} className="text-dense font-medium" />
    ),
  },
  {
    key: "type",
    header: "Type",
    cell: (row) => (
      <Badge
        variant="outline"
        className="text-micro px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border capitalize"
      >
        {row.type === "cross_sell" ? "Cross-sell" : "Upsell"}
      </Badge>
    ),
  },
  {
    key: "stage",
    header: "Stage",
    cell: (row) => (
      <Badge
        variant="outline"
        className={cn("text-micro px-1.5 py-0 h-4", OPP_STAGE_BADGE_CLASSES[row.stage])}
      >
        {OPP_STAGE_LABELS[row.stage]}
      </Badge>
    ),
  },
  {
    key: "value",
    header: "Value",
    cell: (row) => (
      <span className="text-dense tabular-nums">{formatAmount(row.value)}</span>
    ),
  },
  {
    key: "expectedCloseDate",
    header: "Expected Close",
    cell: (row) => (
      <span className="text-dense text-muted-foreground">
        {formatDate(row.expectedCloseDate)}
      </span>
    ),
  },
];

export function ClientOpportunitiesTab({ clientId }: { clientId: number }) {
  const { data, isLoading, isError, refetch } = useClientOpportunities(clientId);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  if (isError)
    return (
      <ErrorState
        compact
        title="Couldn't load opportunities"
        description="The opportunity list didn't load. Check your connection and try again."
        onRetry={handleRetry}
      />
    );

  return (
    <DataTable
      data={data ?? []}
      columns={columns}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyState={
        <EmptyState
          title="No opportunities logged"
          description="Track an upsell or cross-sell here so renewals and expansion don't live only in someone's head."
          compact
          className="py-10"
        />
      }
    />
  );
}
