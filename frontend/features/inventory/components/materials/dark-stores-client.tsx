"use client";

import Link from "next/link";
import { ArrowRight, Boxes, IndianRupee, MapPinned, Store } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { useOpsSummary } from "@/hooks/api/inventory/ops-board";
import { DEFAULT_MONEY_DISPLAY, formatDecimal, formatMoneyRounded } from "@/lib/format-utils";
import { DarkStoreBoard } from "./dark-store-board";
import { StockBucketBar } from "./stock-bucket-bar";

/**
 * B2 — the zone board.
 *
 * One question per row: what is in each Hyderabad zone, how much of it can
 * actually be promised, and where the gaps are. The org-wide totals sit above
 * the per-store cards rather than beside them, because "we hold 15,651 units"
 * and "Uppal is out of cement" are read at different moments.
 */
export function DarkStoresClient() {
  const canRead = useCan("inventory:stock:read");
  const { data, isLoading, error, refetch } = useOpsSummary();

  if (!canRead)
    return (
      <PageWrapper title="Dark Stores" subtitle="What each Hyderabad zone is holding, and what it owes.">
        <NoPermissionState
          permission="inventory:stock:read"
          title="Dark stores unavailable"
          description="Stock by facility needs inventory stock access."
          className="flex-1"
        />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Dark Stores"
      subtitle="What each Hyderabad zone is holding, and what it owes."
      actions={
        <Link
          href="/inventory/warehouses"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Manage Facilities
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <StatCardGridSkeleton cols={4} />
        ) : error ? (
          <ErrorState
            title="Could not load the network totals"
            description="Org-wide stock figures could not be retrieved."
            onRetry={() => void refetch()}
          />
        ) : data ? (
          <>
            <StatCardGrid cols={4}>
              <StatCard label="Dark stores" value={data.facilities.darkStores} icon={Store} tone="blue" />
              <StatCard label="Zones served" value={data.facilities.zones} icon={MapPinned} tone="violet" />
              <StatCard
                label="SKUs stocked"
                value={formatDecimal(data.skuCount, 0)}
                icon={Boxes}
                tone="emerald"
                href="/inventory/stock"
              />
              <StatCard
                label="Stock value at cost"
                value={formatMoneyRounded(data.stockValue, DEFAULT_MONEY_DISPLAY, 0)}
                icon={IndianRupee}
                tone="blue"
                hint="At weighted-average cost"
              />
            </StatCardGrid>

            <Card>
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Network position
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <StockBucketBar buckets={data.quantities} />
              </CardContent>
            </Card>
          </>
        ) : null}

        <DarkStoreBoard />
      </div>
    </PageWrapper>
  );
}
