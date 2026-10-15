"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useCursorPager } from "@/components/ui/table-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useAddCalendarResourceMaintenance,
  useCalendarBookingResources,
  useCreateCalendarResource,
  useInventoryCalendarEquipment,
  useUpdateCalendarResource,
  type CalendarResourceInput,
} from "@/hooks/api/calendar/booking-resources";
import type { BookingResource } from "@/hooks/api/calendar/booking-resources-schema";
import { CalendarDateTimePicker } from "./calendar-date-time-picker";

function newResource(): CalendarResourceInput {
  return {
    kind: "room",
    ownership: "calendar",
    sourceKey: null,
    sourceRecordId: null,
    name: "",
    location: null,
    capacity: 1,
    divisible: false,
    accessibility: [],
    requiresApproval: false,
  };
}

function fromResource(resource: BookingResource): CalendarResourceInput {
  return {
    kind: resource.kind,
    ownership: resource.ownership,
    sourceKey: resource.sourceKey,
    sourceRecordId: resource.sourceRecordId,
    name: resource.name,
    location: resource.location,
    capacity: resource.capacity,
    divisible: resource.divisible,
    accessibility: resource.accessibility,
    requiresApproval: resource.requiresApproval,
  };
}

export function CalendarResourceAdminCard() {
  const { data: session } = useSession();
  const resourcePager = useCursorPager(`${session?.orgId ?? ""}:${session?.user?.id ?? ""}`);
  const resources = useCalendarBookingResources(resourcePager.cursor);
  const canManageInventoryEquipment = useCan("inventory:warehouses:manage");
  const create = useCreateCalendarResource();
  const update = useUpdateCalendarResource();
  const addMaintenance = useAddCalendarResourceMaintenance();
  const [editing, setEditing] = useState<BookingResource | null>(null);
  const [form, setForm] = useState<CalendarResourceInput | null>(null);
  const [status, setStatus] = useState<BookingResource["status"]>("active");
  const [maintenanceTarget, setMaintenanceTarget] = useState<BookingResource | null>(null);
  const [maintenanceStart, setMaintenanceStart] = useState("");
  const [maintenanceEnd, setMaintenanceEnd] = useState("");
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inventoryCursor, setInventoryCursor] = useState<number | null>(null);
  const [inventoryCursorHistory, setInventoryCursorHistory] = useState<Array<number | null>>([]);
  const inventoryEquipment = useInventoryCalendarEquipment(inventoryCursor, form?.sourceKey === "inventory.equipment" && !editing);

  function open(resource: BookingResource | null) {
    setEditing(resource);
    setForm(resource ? fromResource(resource) : newResource());
    setStatus(resource?.status ?? "active");
    setMaintenanceTarget(null);
    setError(null);
    setInventoryCursor(null);
    setInventoryCursorHistory([]);
  }

  function changeInventoryPage(cursor: number | null, history: Array<number | null>) {
    setInventoryCursor(cursor);
    setInventoryCursorHistory(history);
    setForm((current) => current ? { ...current, sourceRecordId: null, name: "", location: null, capacity: 1 } : current);
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return setError("Enter a resource name.");
    if (form.ownership === "source" && !/^[1-9]\d*$/.test(form.sourceRecordId?.trim() ?? ""))
      return setError(form.sourceKey === "inventory.equipment" ? "Choose available Inventory equipment." : "Enter a valid HR asset ID.");
    if (form.sourceKey === "inventory.equipment" && (!canManageInventoryEquipment || !inventoryEquipment.data?.items.some((equipment) => equipment.status === "available" && String(equipment.id) === form.sourceRecordId)))
      return setError("Choose available Inventory equipment you can manage.");
    if (!Number.isInteger(form.capacity) || form.capacity < 1 || form.capacity > 10_000)
      return setError("Capacity must be between 1 and 10,000.");
    setError(null);
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          input: {
            expectedVersion: editing.version,
            name: form.name.trim(),
            location: form.location?.trim() || null,
            capacity: form.capacity,
            divisible: form.divisible,
            accessibility: form.accessibility,
            requiresApproval: form.ownership === "source" || form.requiresApproval,
            status,
          },
        });
      } else {
        await create.mutateAsync({
          ...form,
          requiresApproval: form.ownership === "source" || form.requiresApproval,
          name: form.name.trim(),
          location: form.location?.trim() || null,
          sourceKey: form.ownership === "source" ? form.sourceKey : null,
          sourceRecordId: form.ownership === "source" ? form.sourceRecordId?.trim() || null : null,
        });
      }
      toast.success(editing ? "Resource updated" : "Resource created");
      setEditing(null);
      setForm(null);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function scheduleMaintenance() {
    if (!maintenanceTarget) return;
    const startAt = new Date(maintenanceStart);
    const endAt = new Date(maintenanceEnd);
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt)
      return setError("Choose a valid maintenance start and end.");
    setError(null);
    try {
      await addMaintenance.mutateAsync({
        id: maintenanceTarget.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        reason: maintenanceReason.trim() || null,
      });
      toast.success("Maintenance scheduled");
      setMaintenanceTarget(null);
      setMaintenanceStart("");
      setMaintenanceEnd("");
      setMaintenanceReason("");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return <section className="space-y-4 rounded-xl border bg-card p-4" aria-label="Calendar rooms and equipment">
    <div className="flex items-center justify-between gap-2"><div><h2 className="font-semibold">Rooms and equipment</h2><p className="text-sm text-muted-foreground">Manage capacity and maintenance used by booking pages.</p></div><Button variant="outline" onClick={() => open(null)}>Add resource</Button></div>
    {error ? <p role="alert" className="rounded-md border border-destructive p-2 text-sm text-destructive">{error}</p> : null}
    {form ? <div className="space-y-3 rounded-md border p-3">
      <h3 className="font-medium">{editing ? `Edit ${editing.name}` : "New resource"}</h3>
      {!editing ? <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label htmlFor="resource-kind">Type</Label><Select value={form.kind} disabled={form.ownership === "source"} onValueChange={(value) => setForm({ ...form, kind: value === "room" || value === "equipment" ? value : "resource" })}><SelectTrigger id="resource-kind" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="room">Room</SelectItem><SelectItem value="equipment">Equipment</SelectItem><SelectItem value="resource">Other resource</SelectItem></SelectContent></Select></div>
        <div className="space-y-1"><Label htmlFor="resource-owner">Owner</Label><Select value={form.ownership === "source" ? form.sourceKey === "inventory.equipment" ? "inventory" : "hr" : "calendar"} onValueChange={(owner) => { const ownership = owner === "calendar" ? "calendar" : "source"; setForm({ ...form, ownership, kind: ownership === "source" ? "equipment" : form.kind, sourceKey: owner === "inventory" ? "inventory.equipment" : owner === "hr" ? "hr.asset" : null, sourceRecordId: null, name: owner === "inventory" ? "" : form.name, location: owner === "inventory" ? null : form.location, capacity: owner === "inventory" ? 1 : form.capacity, requiresApproval: ownership === "source" || form.requiresApproval }); }}><SelectTrigger id="resource-owner" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="calendar">Calendar</SelectItem><SelectItem value="hr">HR asset</SelectItem>{canManageInventoryEquipment ? <SelectItem value="inventory">Inventory equipment</SelectItem> : null}</SelectContent></Select></div>
      </div> : <p className="text-sm text-muted-foreground">{editing.kind} · {editing.ownership} owned</p>}
      {form.ownership === "source" && form.sourceKey === "hr.asset" && !editing ? <div className="space-y-1"><Label htmlFor="resource-record">HR asset ID</Label><Input id="resource-record" inputMode="numeric" value={form.sourceRecordId ?? ""} onChange={(event) => setForm({ ...form, sourceRecordId: event.target.value || null })} /><p className="text-xs text-muted-foreground">The HR asset owner confirms eligibility before the booking is confirmed.</p></div> : null}
      {form.ownership === "source" && form.sourceKey === "inventory.equipment" && !editing ? <div className="space-y-1"><Label htmlFor="resource-inventory-equipment">Inventory equipment</Label>{inventoryEquipment.access.denied ? <p className="text-sm text-muted-foreground">Inventory equipment access is unavailable to this account.</p> : inventoryEquipment.access.unavailable || inventoryEquipment.isError ? <ErrorState title="Inventory equipment unavailable" error={inventoryEquipment.error} onRetry={() => void inventoryEquipment.refetch()} /> : inventoryEquipment.access.pending || inventoryEquipment.isPending ? <p role="status">Loading Inventory equipment…</p> : inventoryEquipment.data?.items.some((equipment) => equipment.status === "available") ? <Select value={form.sourceRecordId ?? ""} onValueChange={(value) => { const equipment = inventoryEquipment.data?.items.find((item) => String(item.id) === value); setForm({ ...form, sourceRecordId: equipment ? String(equipment.id) : null, name: equipment?.name ?? "", location: equipment?.location ?? null, capacity: equipment?.capacity ?? 1 }); }}><SelectTrigger id="resource-inventory-equipment" className="w-full"><SelectValue placeholder="Choose available equipment" /></SelectTrigger><SelectContent>{inventoryEquipment.data?.items.filter((equipment) => equipment.status === "available").map((equipment) => <SelectItem key={equipment.id} value={String(equipment.id)}>{equipment.name} · warehouse {equipment.warehouseId} · capacity {equipment.capacity}</SelectItem>)}</SelectContent></Select> : <p className="text-sm text-muted-foreground">No available Inventory equipment is visible to this account.</p>}<p className="text-xs text-muted-foreground">The Inventory owner checks eligibility before the booking is confirmed.</p></div> : null}
      {form.ownership === "source" && form.sourceKey === "inventory.equipment" && !editing && (inventoryCursorHistory.length > 0 || inventoryEquipment.data?.nextCursor) ? <div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={inventoryCursorHistory.length === 0 || inventoryEquipment.isFetching} onClick={() => changeInventoryPage(inventoryCursorHistory.at(-1) ?? null, inventoryCursorHistory.slice(0, -1))}>Previous equipment</Button><Button type="button" size="sm" variant="outline" disabled={!inventoryEquipment.data?.nextCursor || inventoryEquipment.isFetching} onClick={() => { const next = inventoryEquipment.data?.nextCursor; if (next) changeInventoryPage(next, [...inventoryCursorHistory, inventoryCursor]); }}>Next equipment</Button></div> : null}
      <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="resource-name">Name</Label><Input id="resource-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="space-y-1"><Label htmlFor="resource-location">Location</Label><Input id="resource-location" value={form.location ?? ""} onChange={(event) => setForm({ ...form, location: event.target.value || null })} /></div><div className="space-y-1"><Label htmlFor="resource-capacity">Capacity</Label><Input id="resource-capacity" type="number" min={1} max={10000} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></div>{editing ? <div className="space-y-1"><Label htmlFor="resource-status">Status</Label><Select value={status} onValueChange={(value) => setStatus(value === "active" || value === "unavailable" ? value : "retired")}><SelectTrigger id="resource-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="unavailable">Unavailable</SelectItem><SelectItem value="retired">Retired</SelectItem></SelectContent></Select></div> : null}</div>
      <div className="space-y-1"><Label htmlFor="resource-accessibility">Accessibility features</Label><Input id="resource-accessibility" placeholder="Comma-separated" value={form.accessibility.join(", ")} onChange={(event) => setForm({ ...form, accessibility: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></div>
      <div className="flex items-center gap-2"><Checkbox id="resource-divisible" checked={form.divisible} onCheckedChange={(checked) => setForm({ ...form, divisible: checked === true })} /><Label htmlFor="resource-divisible">Capacity can be divided between bookings</Label></div>
      <div className="flex items-center gap-2"><Checkbox id="resource-requires-approval" checked={form.ownership === "source" || form.requiresApproval} disabled={form.ownership === "source"} onCheckedChange={(checked) => setForm({ ...form, requiresApproval: checked === true })} /><Label htmlFor="resource-requires-approval">Owner approval is required</Label></div>
      <div className="flex gap-2"><Button onClick={() => void save()} disabled={create.isPending || update.isPending}>Save resource</Button><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button></div>
    </div> : null}
    {maintenanceTarget ? <div className="space-y-3 rounded-md border p-3"><h3 className="font-medium">Maintenance for {maintenanceTarget.name}</h3><div className="grid grid-cols-1 gap-2 md:grid-cols-2"><div className="space-y-1"><Label htmlFor="maintenance-start">Starts</Label><CalendarDateTimePicker id="maintenance-start" label="Starts" value={maintenanceStart} onChange={setMaintenanceStart} /></div><div className="space-y-1"><Label htmlFor="maintenance-end">Ends</Label><CalendarDateTimePicker id="maintenance-end" label="Ends" value={maintenanceEnd} onChange={setMaintenanceEnd} /></div></div><div className="space-y-1"><Label htmlFor="maintenance-reason">Reason</Label><Input id="maintenance-reason" value={maintenanceReason} onChange={(event) => setMaintenanceReason(event.target.value)} /></div><div className="flex gap-2"><Button onClick={() => void scheduleMaintenance()} disabled={addMaintenance.isPending}>Schedule maintenance</Button><Button variant="outline" onClick={() => setMaintenanceTarget(null)}>Cancel</Button></div></div> : null}
    {resources.access.denied ? <p className="text-sm">Resource inventory is unavailable to this account.</p> : resources.access.unavailable ? <ErrorState title="Resource inventory unavailable" onRetry={() => void resources.refetch()} /> : resources.access.pending || resources.isPending ? <p role="status">Loading resources…</p> : resources.isError ? <ErrorState error={resources.error} onRetry={() => void resources.refetch()} /> : resources.data?.items.length ? <div className="space-y-2">{resources.data.items.map((resource) => <div key={resource.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"><div><p className="text-sm font-medium">{resource.name}</p><p className="text-xs text-muted-foreground">{resource.kind} · {resource.status} · capacity {resource.capacity}{resource.location ? ` · ${resource.location}` : ""}{resource.requiresApproval ? " · approval required" : ""}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => open(resource)}>Edit</Button>{resource.status !== "retired" ? <Button size="sm" variant="outline" onClick={() => { setMaintenanceTarget(resource); setForm(null); setError(null); }}>Maintenance</Button> : null}</div></div>)}</div> : <p className="text-sm text-muted-foreground">No rooms or equipment yet.</p>}
    {resourcePager.hasPrevious || resources.data?.nextCursor ? <CursorPageControls page={resourcePager.pageNumber} hasNext={Boolean(resources.data?.nextCursor)} disabled={resources.isFetching} onPrevious={resourcePager.goPrevious} onNext={() => resourcePager.goNext(resources.data?.nextCursor)} /> : null}
  </section>;
}
