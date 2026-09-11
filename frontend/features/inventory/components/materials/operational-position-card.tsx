"use client";

import Link from "next/link";
import { ArrowRight, Boxes, Store } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { useOpsSummary } from "@/hooks/api/inventory/ops-board";
import { DEFAULT_MONEY_DISPLAY, formatMoneyRounded } from "@/lib/format-utils";
import { StockBucketBar } from "./stock-bucket-bar";

/**
 * B2 — "what do we have, and how much of it can we actually promise".
 *
 * The seven buckets side by side, never a single "stock" number: the whole
 * failure this module exists to prevent is somebody reading on-hand as
 * available and selling material that is already held for a site.
 */
export function OperationalPositionCard() {
  const canRead = useCan("inventory:stock:read");
  const { data, isLoading, error, refetch } = useOpsSummary();

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Boxes className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          Position right now
        </CardTitle>
        <CardAction>
          <Link
            href="/inventory/dark-stores"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            By dark store <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        {!canRead ? (
          <NoPermissionState
            compact
            permission="inventory:stock:read"
            title="Quantities hidden"
            description="On-hand and available stock need stock-level access."
          />
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-14" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            compact
            title="Could not load quantities"
            description="Stock buckets could not be retrieved."
            onRetry={() => void refetch()}
          />
        ) : data ? (
          <div className="space-y-4">
            <StockBucketBar buckets={data.quantities} />
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-3 text-dense text-muted-foreground">
              <Store className="h-3 w-3" aria-hidden="true" />
              <span>
                <span className="tabular-nums font-medium text-foreground">{data.facilities.darkStores}</span> dark
                stores across <span className="tabular-nums font-medium text-foreground">{data.facilities.zones}</span>{" "}
                zones
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="tabular-nums font-medium text-foreground">{data.skuCount}</span> SKUs
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="tabular-nums font-medium text-foreground">{formatMoneyRounded(data.stockValue, DEFAULT_MONEY_DISPLAY, 0)}</span> at cost
              </span>
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
