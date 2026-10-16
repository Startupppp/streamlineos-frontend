"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { useCreateInventoryCalendarEquipment } from "@/hooks/api/calendar/booking-resources";
import type { InventoryCalendarEquipment } from "@/hooks/api/calendar/booking-resources-schema";
import { getErrorMessage } from "@/lib/get-error-message";

export function InventoryCalendarEquipmentCreate({ onCreated }: { onCreated: (equipment: InventoryCalendarEquipment) => void }) {
  const [warehousePage, setWarehousePage] = useState(1);
  const warehouses = useWarehouses({ status: "active", page: warehousePage, limit: 50 });
  const create = useCreateInventoryCalendarEquipment();
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [productVariantId, setProductVariantId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const activeWarehouses = warehouses.data?.items.filter((warehouse) => warehouse.isActive) ?? [];

  async function submit() {
    if (!warehouseId || !activeWarehouses.some((warehouse) => warehouse.id === warehouseId)) return setError("Choose an active warehouse you can access.");
    if (!name.trim() || name.trim().length > 200) return setError("Enter an equipment name of at most 200 characters.");
    if (location.trim().length > 200) return setError("Location must be at most 200 characters.");
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) return setError("Capacity must be between 1 and 1,000.");
    setError(null);
    try {
      const equipment = await create.mutateAsync({ warehouseId, productVariantId: productVariantId ? Number(productVariantId) : null, name: name.trim(), location: location.trim() || null, capacity });
      onCreated(equipment);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return <div className="space-y-3 rounded-md border p-3" aria-label="Create Inventory equipment for Calendar">
    <div><h4 className="text-sm font-medium">Create Inventory equipment</h4><p className="text-xs text-muted-foreground">Inventory owns eligibility and allocation for this equipment.</p></div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {warehouses.isError ? <ErrorState title="Warehouses unavailable" error={warehouses.error} onRetry={() => void warehouses.refetch()} /> : warehouses.isPending ? <p role="status" className="text-sm">Loading warehouses…</p> : activeWarehouses.length ? <div className="space-y-1"><Label htmlFor="calendar-equipment-warehouse">Warehouse</Label><Select value={warehouseId === null ? "" : String(warehouseId)} onValueChange={(value) => setWarehouseId(Number(value))}><SelectTrigger id="calendar-equipment-warehouse" className="w-full"><SelectValue placeholder="Choose an active warehouse" /></SelectTrigger><SelectContent>{activeWarehouses.map((warehouse) => <SelectItem key={warehouse.id} value={String(warehouse.id)}>{warehouse.name} · {warehouse.code}</SelectItem>)}</SelectContent></Select></div> : <p className="text-sm text-muted-foreground">No active warehouse is available on this page.</p>}
    {warehouses.data && warehouses.data.totalPages > 1 ? <div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={warehousePage === 1 || warehouses.isFetching} onClick={() => { setWarehousePage((page) => page - 1); setWarehouseId(null); }}>Previous warehouses</Button><span className="text-xs text-muted-foreground">{warehousePage} of {warehouses.data.totalPages}</span><Button type="button" size="sm" variant="outline" disabled={warehousePage >= warehouses.data.totalPages || warehouses.isFetching} onClick={() => { setWarehousePage((page) => page + 1); setWarehouseId(null); }}>Next warehouses</Button></div> : null}
    <div className="space-y-1"><Label>Inventory product variant</Label><ProductVariantCombobox value={productVariantId} onChange={setProductVariantId} ariaLabel="Inventory product variant" placeholder="Select a product variant" /><p className="text-xs text-muted-foreground">Link a variant to limit equipment capacity to available stock in the selected warehouse.</p></div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="calendar-equipment-name">Equipment name</Label><Input id="calendar-equipment-name" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="calendar-equipment-location">Equipment location</Label><Input id="calendar-equipment-location" maxLength={200} value={location} onChange={(event) => setLocation(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="calendar-equipment-capacity">Equipment capacity</Label><Input id="calendar-equipment-capacity" type="number" min={1} max={1000} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} /></div></div>
    <LoadingButton type="button" size="sm" isPending={create.isPending} disabled={!warehouseId || warehouses.isFetching || warehouses.isError} onClick={() => void submit()}>Create and select equipment</LoadingButton>
  </div>;
}
