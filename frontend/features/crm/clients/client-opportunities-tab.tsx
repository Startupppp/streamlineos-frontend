"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { useClientOpportunities } from "@/hooks/api/crm/clients";
import { formatAmount, formatDate } from "./utils";
import type { ClientOpportunity } from "@/types/crm";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";

const OPP_STAGE_LABELS: Record<ClientOpportunity["stage"], string> = {
  identified: "Identified",
  proposed: "Proposed",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

const OPP_STAGE_BADGE_CLASSES: Record<ClientOpportunity["stage"], string> = {
  identified: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  proposed: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  negotiating: "bg-muted text-muted-foreground border-border",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  lost: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

const columns: DataTableColumn<ClientOpportunity>[] = [
  {
    key: "title",
    header: "Title",
    className: TABLE_TITLE_CELL,
    cell: (row) => (
      <span className={cn("text-[11px] font-medium", TEXT_ONE_LINE)} title={row.title}>
        {row.title}
      </span>
    ),
  },
  {
    key: "type",
    header: "Type",
    cell: (row) => (
      <Badge
        variant="outline"
        className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border capitalize"
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
        className={cn("text-[9px] px-1.5 py-0 h-4", OPP_STAGE_BADGE_CLASSES[row.stage])}
      >
        {OPP_STAGE_LABELS[row.stage]}
      </Badge>
    ),
  },
  {
    key: "value",
    header: "Value",
    cell: (row) => (
      <span className="text-[11px] tabular-nums">{formatAmount(row.value)}</span>
    ),
  },
  {
    key: "expectedCloseDate",
    header: "Expected Close",
    cell: (row) => (
      <span className="text-[11px] text-muted-foreground">
        {formatDate(row.expectedCloseDate)}
      </span>
    ),
  },
];

export function ClientOpportunitiesTab({ clientId }: { clientId: number }) {
  const { data, isLoading } = useClientOpportunities(clientId);

  return (
    <DataTable
      data={data ?? []}
      columns={columns}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyState={
        <EmptyState
          title="No opportunities"
          description="Upsell and cross-sell opportunities will appear here."
          compact
          className="py-10"
        />
      }
    />
  );
}
