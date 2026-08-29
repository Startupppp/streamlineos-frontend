"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { useSalesOrders } from "@/hooks/api/inventory/sales-orders";
import { useCreatePickWave } from "@/hooks/api/inventory/picking";

interface CreateWaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (pickListId: number) => void;
}

/** A wave is capped server-side at 50 orders; say so before the request fails. */
const MAX_ORDERS = 50;

/**
 * Build one walk out of several orders.
 *
 * The whole point of a wave is that a picker who would otherwise visit the same
 * aisle four times for four orders visits it once, so the dialog is a
 * multi-select over the reserved queue rather than a per-order action.
 */
export function CreateWaveDialog({ open, onOpenChange, onCreated }: CreateWaveDialogProps) {
  const [warehouseId, setWarehouseId] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  const warehouses = useWarehouses({ status: "active" });
  const orders = useSalesOrders({ status: "RESERVED", limit: MAX_ORDERS });
  const createWave = useCreatePickWave();

  const rows = orders.data?.items ?? [];

  function reset(): void {
    setWarehouseId("");
    setSelected([]);
  }

  function handleOpenChange(next: boolean): void {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  function handleWarehouseChange(value: string): void {
    setWarehouseId(value);
  }

  function toggleOrder(soId: number): void {
    setSelected((current) =>
      current.includes(soId)
        ? current.filter((id) => id !== soId)
        : current.length >= MAX_ORDERS
          ? current
          : [...current, soId],
    );
  }

  function handleSubmit(): void {
    if (!warehouseId || selected.length === 0) return;
    createWave.mutate(
      { warehouseId: Number(warehouseId), soIds: selected },
      {
        onSuccess: (result) => {
          toast.success(
            result.unallocatedLines > 0
              ? `${result.pickNumber} created — ${result.unallocatedLines} line(s) have no stock to pick from`
              : `${result.pickNumber} created`,
          );
          reset();
          onOpenChange(false);
          onCreated(result.pickListId);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="New pick wave"
      description="Gather several reserved orders into one walk across the warehouse."
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            onClick={handleSubmit}
            isPending={createWave.isPending}
            loadingText="Creating…"
            disabled={!warehouseId || selected.length === 0}
          >
            Create wave
          </LoadingButton>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="wave-warehouse">Warehouse</Label>
          <Select value={warehouseId} onValueChange={handleWarehouseChange}>
            <SelectTrigger id="wave-warehouse">
              <SelectValue placeholder="Which building is this walk in?" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              {(warehouses.data ?? []).map((warehouse) => (
                <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Reserved orders ({selected.length} selected)</Label>
          <div className="max-h-72 overflow-y-auto rounded-md border border-border">
            {orders.isLoading ? (
              <div className="flex flex-col gap-2 p-2">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-9 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No reserved orders are waiting to be picked.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((order) => (
                  <li key={order.id} className="flex items-center gap-3 px-3 py-2">
                    <Checkbox
                      id={`wave-order-${order.id}`}
                      checked={selected.includes(order.id)}
                      onCheckedChange={() => toggleOrder(order.id)}
                    />
                    <Label
                      htmlFor={`wave-order-${order.id}`}
                      className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 font-normal"
                    >
                      <span className="truncate font-mono text-xs tabular-nums">
                        {order.soNumber}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {order.customerName ?? "—"}
                      </span>
                    </Label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppDialog>
  );
}
