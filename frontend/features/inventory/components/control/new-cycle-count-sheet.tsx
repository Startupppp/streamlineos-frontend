"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useCreateCycleCount } from "@/hooks/api/inventory/counts";
import { useLocations } from "@/hooks/api/inventory/warehouses";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
import { useCategories } from "@/hooks/api/inventory/products";

export function NewCycleCountSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");

  const { data: locations = [] } = useLocations(warehouseId ? Number(warehouseId) : 0);
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateCycleCount();

  function handleWarehouseChange(value: string): void {
    setWarehouseId(value === "none" ? "" : value);
    setLocationId("");
  }

  function handleLocationChange(value: string): void {
    setLocationId(value === "none" ? "" : value);
  }

  function handleCategoryChange(value: string): void {
    setCategoryId(value === "none" ? "" : value);
  }

  function handleClose(): void {
    setWarehouseId("");
    setLocationId("");
    setCategoryId("");
    onClose();
  }

  function handleSubmit(): void {
    if (!warehouseId) return;
    createMutation.mutate(
      {
        warehouseId: Number(warehouseId),
        locationId: locationId ? Number(locationId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="bg-muted/40 p-6 pb-4 pr-12 border-b text-left">
          <SheetTitle>New Cycle Count</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="cc-warehouse" className="text-xs font-semibold text-foreground/80">Warehouse *</Label>
            <WarehouseSelect
              value={warehouseId}
              onChange={handleWarehouseChange}
              ariaLabel="Warehouse"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-location" className="text-xs font-semibold text-foreground/80">Location (optional)</Label>
            <Select
              value={locationId || "none"}
              onValueChange={handleLocationChange}
              disabled={!warehouseId}
            >
              <SelectTrigger id="cc-location" className="text-sm">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All locations</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-category" className="text-xs font-semibold text-foreground/80">Category (optional)</Label>
            <Select value={categoryId || "none"} onValueChange={handleCategoryChange}>
              <SelectTrigger id="cc-category" className="text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetBody>
        <SheetFooter className="shrink-0 flex-row gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <LoadingButton
            className="flex-1"
            onClick={handleSubmit}
            disabled={!warehouseId}
            isPending={createMutation.isPending}
            loadingText="Creating…"
          >
            Create Count
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
