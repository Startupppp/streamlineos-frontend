"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Layers } from "lucide-react";
import { AppSheet, ErrorState, NoPermissionState } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import {
  useAllocateChannelPool,
  useChannelPools,
  type ChannelPool,
} from "@/hooks/api/inventory/channel-pools";
import type { Channel } from "@/hooks/api/inventory/channels";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";

interface ChannelPoolsPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: Channel | null;
}

function formatQty(value: string): string {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

const POOL_COLUMNS: DataTableColumn<ChannelPool>[] = [
  {
    key: "variant",
    header: "Variant",
    cell: (row) => <span className="text-sm font-medium">#{row.productVariantId}</span>,
  },
  {
    key: "warehouse",
    header: "Warehouse",
    // Null is not "unknown" here — it is an organisation-wide claim, and saying
    // so is the difference between a reader trusting the number and hunting for
    // a warehouse that was never chosen.
    cell: (row) =>
      row.warehouseId === null ? (
        <span className="text-xs text-muted-foreground">Org-wide</span>
      ) : (
        <span className="text-xs">#{row.warehouseId}</span>
      ),
  },
  {
    key: "reserved",
    header: "Reserved",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-semibold",
    cell: (row) => formatQty(row.reservedQty),
  },
  {
    key: "published",
    header: "Published",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-muted-foreground",
    cell: (row) => formatQty(row.publishedQty),
  },
];

/**
 * NEO-1 — the claims one channel holds, and the one control that moves them.
 *
 * Deliberately a signed delta rather than a "set to" field: the server command
 * is a delta so that a retried request cannot claim twice, and a form that
 * pretended otherwise would have to read the current figure, subtract, and race
 * anybody else doing the same.
 */
export function ChannelPoolsPanel({ open, onOpenChange, channel }: ChannelPoolsPanelProps) {
  const canManage = useCan("inventory:channels:manage");
  const { data, isLoading, isError, refetch } = useChannelPools(channel?.id ?? null);
  const allocate = useAllocateChannelPool();

  const [productVariantId, setProductVariantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [deltaQty, setDeltaQty] = useState("");

  const pools = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleAllocate = useCallback(() => {
    if (!channel) return;
    const variant = Number(productVariantId);
    if (!Number.isInteger(variant) || variant <= 0) {
      toast.error("Enter a product variant id");
      return;
    }
    if (!/^-?\d{1,14}(\.\d{1,4})?$/.test(deltaQty) || Number(deltaQty) === 0) {
      toast.error("Enter a non-zero quantity with up to 4 decimal places");
      return;
    }
    allocate.mutate(
      {
        channelId: channel.id,
        productVariantId: variant,
        warehouseId: warehouseId.trim() === "" ? null : Number(warehouseId),
        deltaQty,
      },
      {
        onSuccess: (pool) => {
          toast.success(`${channel.name} now holds ${formatQty(pool.reservedQty)}`);
          setDeltaQty("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [allocate, channel, deltaQty, productVariantId, warehouseId]);

  const title = channel ? `Reserved stock — ${channel.name}` : "Reserved stock";

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title={title} className="sm:max-w-2xl">
      {!canManage ? (
        <div className="p-6">
          <NoPermissionState permission="inventory:channels:manage" />
        </div>
      ) : isLoading ? (
        <div className="p-6 space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-6">
          <ErrorState
            title="Failed to load reserved stock"
            description="An error occurred while fetching this channel's pools."
            onRetry={handleRetry}
          />
        </div>
      ) : (
        <div className="p-6 space-y-5">
          <p className="text-xs text-muted-foreground">
            Stock reserved here is withheld from every other channel&apos;s available-to-promise,
            including direct sales. It is a claim, not a movement: on-hand is unchanged, and the
            claim is drawn down as this channel&apos;s orders ship.
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pool-variant">Product variant id</Label>
                <Input
                  id="pool-variant"
                  inputMode="numeric"
                  value={productVariantId}
                  onChange={(e) => setProductVariantId(e.target.value)}
                  placeholder="e.g. 42"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pool-warehouse">Warehouse id</Label>
                <Input
                  id="pool-warehouse"
                  inputMode="numeric"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  placeholder="Blank = org-wide"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pool-delta">Change</Label>
                <Input
                  id="pool-delta"
                  value={deltaQty}
                  onChange={(e) => setDeltaQty(e.target.value)}
                  placeholder="6 or -6"
                />
              </div>
            </div>
            <LoadingButton
              size="sm"
              onClick={handleAllocate}
              isPending={allocate.isPending}
              loadingText="Applying…"
            >
              <Layers className="h-3.5 w-3.5" />
              Apply change
            </LoadingButton>
          </div>

          {pools.length > 0 ? (
            <DataTable
              data={pools}
              columns={POOL_COLUMNS}
              getRowKey={(row) => row.id}
              className="border-0"
            />
          ) : (
            <InventoryEmptyState
              illustration={<EmptyWarehouseIllustration />}
              title="Nothing reserved to this channel"
              description="Every unit on hand is still available to every other channel. Reserve stock above to hold it back."
            />
          )}
        </div>
      )}
    </AppSheet>
  );
}
