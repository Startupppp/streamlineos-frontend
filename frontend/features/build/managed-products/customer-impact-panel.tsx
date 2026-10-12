"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useProductCustomerImpact } from "@/hooks/api/feedbucket/use-feedbucket-product-stats";
import type { FeedbucketCustomerImpactRow } from "@/hooks/api/feedbucket/feedbucket-schema";

const OPP_TONE = statusToneClasses("info");

interface CustomerImpactPanelProps {
  managedProductId: number;
}

function feedbackHref(managedProductId: number, crmOrganizationId: number) {
  return `/build/managed-products/${managedProductId}/feedback?crmOrganizationId=${crmOrganizationId}`;
}

function CustomerImpactRow({
  row,
  managedProductId,
}: {
  row: FeedbucketCustomerImpactRow;
  managedProductId: number;
}) {
  return (
    <Link
      href={feedbackHref(managedProductId, row.crmOrganizationId)}
      className="group flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0 transition-colors hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {row.customerName ?? "Unknown customer"}
      </span>
      <span
        className="font-mono tabular-nums text-xs text-muted-foreground"
        aria-label={`${row.submissionCount} submissions`}
      >
        {row.submissionCount}
      </span>
      {row.opportunityCount > 0 && (
        <span className={cn("rounded-full px-2 py-0.5 font-mono tabular-nums text-xs", OPP_TONE.surface, OPP_TONE.ink)}>
          {row.opportunityCount} opp
        </span>
      )}
      {row.accountValue != null && (
        <span className="font-mono tabular-nums text-xs text-muted-foreground">
          {row.accountValue}
        </span>
      )}
    </Link>
  );
}

export function CustomerImpactPanel({ managedProductId }: CustomerImpactPanelProps) {
  const { data, isLoading } = useProductCustomerImpact(managedProductId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Customer impact</h3>
        <span className="text-xs text-muted-foreground">Submissions</span>
      </div>
      <div className="flex flex-col">
        {data.rows.map((row) => (
          <CustomerImpactRow
            key={row.crmOrganizationId}
            row={row}
            managedProductId={managedProductId}
          />
        ))}
      </div>
    </div>
  );
}
