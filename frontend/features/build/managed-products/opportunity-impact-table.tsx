"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductOpportunityImpact } from "@/hooks/api/feedbucket/use-feedbucket-product-stats";
import type { FeedbucketOpportunityImpactRow } from "@/hooks/api/feedbucket/feedbucket-schema";

interface OpportunityImpactTableProps {
  managedProductId: number;
}

function opportunityInsightsHref(
  managedProductId: number,
  opportunityId: number,
) {
  return `/build/managed-products/${managedProductId}/insights?view=discovery&opportunity=${opportunityId}`;
}

function ImpactRow({
  row,
  managedProductId,
  showTier,
}: {
  row: FeedbucketOpportunityImpactRow;
  managedProductId: number;
  showTier: boolean;
}) {
  const tier = (row as Record<string, unknown>).tier as string | null | undefined;

  return (
    <tr className="border-b border-border/60 last:border-b-0">
      <td className="py-2 pl-4 pr-2">
        <Link
          href={opportunityInsightsHref(managedProductId, row.opportunityId)}
          className="text-sm text-primary hover:underline"
        >
          #{row.opportunityId}
        </Link>
      </td>
      <td className="py-2 px-2 text-right text-xs font-mono tabular-nums text-muted-foreground">
        {row.distinctCustomers}
      </td>
      <td className="hidden py-2 px-2 md:table-cell">
        {row.segments.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {row.segments.join(", ")}
          </span>
        ) : null}
      </td>
      {showTier ? (
        <td className="hidden py-2 px-2 md:table-cell">
          {tier ? (
            <span className="text-xs text-muted-foreground" data-testid={`tier-${row.opportunityId}`}>
              {tier}
            </span>
          ) : null}
        </td>
      ) : null}
      <td className="py-2 px-2 text-right text-xs font-mono tabular-nums text-muted-foreground">
        {row.requestCount}
      </td>
      <td className="py-2 pl-2 pr-4 text-right text-xs font-mono tabular-nums text-muted-foreground">
        {row.summedAccountValue ?? (
          <span className="text-muted-foreground/50">Restricted</span>
        )}
      </td>
    </tr>
  );
}

export function OpportunityImpactTable({
  managedProductId,
}: OpportunityImpactTableProps) {
  const { data, isLoading } = useProductOpportunityImpact(managedProductId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="px-4 py-3">
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!data || data.rows.length === 0) return null;

  const showTier = data.rows.some(
    (r) => (r as Record<string, unknown>).tier != null,
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Opportunity breakdown
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/60">
              <th className="py-1.5 pl-4 pr-2 text-left text-xs font-medium text-muted-foreground">
                Opportunity
              </th>
              <th className="py-1.5 px-2 text-right text-xs font-medium text-muted-foreground">
                Customers
              </th>
              <th className="hidden py-1.5 px-2 text-left text-xs font-medium text-muted-foreground md:table-cell">
                Segments
              </th>
              {showTier ? (
                <th className="hidden py-1.5 px-2 text-left text-xs font-medium text-muted-foreground md:table-cell">
                  Tier
                </th>
              ) : null}
              <th className="py-1.5 px-2 text-right text-xs font-medium text-muted-foreground">
                Requests
              </th>
              <th className="py-1.5 pl-2 pr-4 text-right text-xs font-medium text-muted-foreground">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <ImpactRow
                key={row.opportunityId}
                row={row}
                managedProductId={managedProductId}
                showTier={showTier}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
