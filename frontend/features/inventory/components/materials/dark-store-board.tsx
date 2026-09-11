"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Clock, MapPin, PackageX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useMotionVariants } from "@/lib/motion-variants";
import { DEFAULT_MONEY_DISPLAY, formatDecimal, formatMoneyRounded } from "@/lib/format-utils";
import { useCan } from "@/hooks/api/access";
import { useDarkStores, type DarkStoreRow } from "@/hooks/api/inventory/ops-board";
import { StockBucketBar } from "./stock-bucket-bar";

function StoreCard({ store, index }: { store: DarkStoreRow; index: number }) {
  const { fadeUp } = useMotionVariants();
  const isDark = store.facilityType === "DARK_STORE";

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: Math.min(index, 6) * 0.04 }}>
      <Card className="h-full">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <Link
                  href={`/inventory/warehouses/${store.warehouseId}`}
                  className="truncate text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {store.name}
                </Link>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-dense text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                <span className="font-mono">{store.code}</span>
                {store.zoneLabel ? <span>· {store.zoneLabel}</span> : null}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="h-5 text-micro">
                {isDark ? "Dark store" : store.facilityType.replace("_", " ").toLowerCase()}
              </Badge>
              {store.deliveryPromiseMinutes ? (
                <Badge variant="outline" className="h-5 gap-1 text-micro">
                  <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                  {store.deliveryPromiseMinutes} min
                </Badge>
              ) : null}
              {!store.isActive ? (
                <Badge variant="outline" className="h-5 border-status-neutral-rule text-micro text-status-neutral-ink">
                  Inactive
                </Badge>
              ) : null}
            </div>
          </div>

          <StockBucketBar
            dense
            buckets={{
              onHand: store.onHand,
              available: store.available,
              reserved: store.reserved,
              damaged: store.damaged,
              quarantined: store.quarantined,
              picked: store.picked,
              inTransit: store.inTransit,
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
            <p className="text-dense text-muted-foreground">
              <span className="tabular-nums font-medium text-foreground">{formatDecimal(store.skuCount, 0)}</span> SKUs ·{" "}
              <span className="tabular-nums font-medium text-foreground">{formatMoneyRounded(store.stockValue, DEFAULT_MONEY_DISPLAY, 0)}</span> at cost
            </p>
            {store.outOfStockSkus > 0 ? (
              <Link
                href={`/inventory/stock?warehouseId=${store.warehouseId}&stockStatus=out`}
                className="inline-flex items-center gap-1 rounded-md border border-status-danger-rule bg-status-danger-surface px-2 py-0.5 text-dense font-medium text-status-danger-ink hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PackageX className="h-3 w-3" aria-hidden="true" />
                {store.outOfStockSkus} out of stock
              </Link>
            ) : (
              <span className="text-dense text-muted-foreground">No stockouts</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DarkStoreBoard() {
  const canRead = useCan("inventory:stock:read");
  const { data, isLoading, error, refetch } = useDarkStores();

  if (!canRead)
    return (
      <NoPermissionState
        compact
        permission="inventory:stock:read"
        title="Dark stores hidden"
        description="Stock by facility needs stock-level access."
      />
    );

  if (isLoading)
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    );

  if (error)
    return (
      <ErrorState
        title="Could not load the dark stores"
        description="Stock by facility could not be retrieved."
        onRetry={() => void refetch()}
      />
    );

  const stores = data ?? [];
  if (stores.length === 0)
    return (
      <InventoryEmptyState
        title="No dark stores yet"
        description="Add a facility and mark it as a dark store to see its zone, promise and stock here."
        action={{ label: "Add Dark Store", href: "/inventory/warehouses" }}
      />
    );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {stores.map((s, i) => (
        <StoreCard key={s.warehouseId} store={s} index={i} />
      ))}
    </div>
  );
}
