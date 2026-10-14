"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAddCalendarResourceMaintenance,
  useCalendarBookingResources,
  useCreateCalendarResource,
  useUpdateCalendarResource,
  type CalendarResourceInput,
} from "@/hooks/api/calendar/booking-resources";
import type { BookingResource } from "@/hooks/api/calendar/booking-resources-schema";

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
  const resources = useCalendarBookingResources();
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

  function open(resource: BookingResource | null) {
    setEditing(resource);
    setForm(resource ? fromResource(resource) : newResource());
    setStatus(resource?.status ?? "active");
    setMaintenanceTarget(null);
    setError(null);
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return setError("Enter a resource name.");
    if (form.ownership === "source" && (!form.sourceKey?.trim() || !form.sourceRecordId?.trim()))
      return setError("Enter the source and source record for a source-owned resource.");
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
            requiresApproval: form.requiresApproval,
            status,
          },
        });
      } else {
        await create.mutateAsync({
          ...form,
          name: form.name.trim(),
          location: form.location?.trim() || null,
          sourceKey: form.ownership === "source" ? form.sourceKey?.trim() || null : null,
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
      {!editing ? <div className="grid grid-cols-2 gap-2"><label className="text-sm">Type<select className="block w-full rounded-md border bg-background p-2" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as CalendarResourceInput["kind"] })}><option value="room">Room</option><option value="equipment">Equipment</option><option value="resource">Other resource</option></select></label><label className="text-sm">Owner<select className="block w-full rounded-md border bg-background p-2" value={form.ownership} onChange={(event) => setForm({ ...form, ownership: event.target.value as CalendarResourceInput["ownership"], sourceKey: null, sourceRecordId: null })}><option value="calendar">Calendar</option><option value="source">Another module</option></select></label></div> : <p className="text-sm text-muted-foreground">{editing.kind} · {editing.ownership} owned</p>}
      {form.ownership === "source" && !editing ? <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="resource-source">Source key</Label><Input id="resource-source" value={form.sourceKey ?? ""} onChange={(event) => setForm({ ...form, sourceKey: event.target.value || null })} /></div><div className="space-y-1"><Label htmlFor="resource-record">Source record ID</Label><Input id="resource-record" value={form.sourceRecordId ?? ""} onChange={(event) => setForm({ ...form, sourceRecordId: event.target.value || null })} /></div></div> : null}
      <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="resource-name">Name</Label><Input id="resource-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="space-y-1"><Label htmlFor="resource-location">Location</Label><Input id="resource-location" value={form.location ?? ""} onChange={(event) => setForm({ ...form, location: event.target.value || null })} /></div><div className="space-y-1"><Label htmlFor="resource-capacity">Capacity</Label><Input id="resource-capacity" type="number" min={1} max={10000} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></div>{editing ? <label className="text-sm">Status<select className="block w-full rounded-md border bg-background p-2" value={status} onChange={(event) => setStatus(event.target.value as BookingResource["status"])}><option value="active">Active</option><option value="unavailable">Unavailable</option><option value="retired">Retired</option></select></label> : null}</div>
      <div className="space-y-1"><Label htmlFor="resource-accessibility">Accessibility features</Label><Input id="resource-accessibility" placeholder="Comma-separated" value={form.accessibility.join(", ")} onChange={(event) => setForm({ ...form, accessibility: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.divisible} onChange={(event) => setForm({ ...form, divisible: event.target.checked })} />Capacity can be divided between bookings</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} />Owner approval is required</label>
      <div className="flex gap-2"><Button onClick={() => void save()} disabled={create.isPending || update.isPending}>Save resource</Button><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button></div>
    </div> : null}
    {maintenanceTarget ? <div className="space-y-3 rounded-md border p-3"><h3 className="font-medium">Maintenance for {maintenanceTarget.name}</h3><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="maintenance-start">Starts</Label><Input id="maintenance-start" type="datetime-local" value={maintenanceStart} onChange={(event) => setMaintenanceStart(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="maintenance-end">Ends</Label><Input id="maintenance-end" type="datetime-local" value={maintenanceEnd} onChange={(event) => setMaintenanceEnd(event.target.value)} /></div></div><div className="space-y-1"><Label htmlFor="maintenance-reason">Reason</Label><Input id="maintenance-reason" value={maintenanceReason} onChange={(event) => setMaintenanceReason(event.target.value)} /></div><div className="flex gap-2"><Button onClick={() => void scheduleMaintenance()} disabled={addMaintenance.isPending}>Schedule maintenance</Button><Button variant="outline" onClick={() => setMaintenanceTarget(null)}>Cancel</Button></div></div> : null}
    {resources.access.denied ? <p className="text-sm">Resource inventory is unavailable to this account.</p> : resources.access.unavailable ? <ErrorState title="Resource inventory unavailable" onRetry={() => void resources.refetch()} /> : resources.access.pending || resources.isPending ? <p role="status">Loading resources…</p> : resources.isError ? <ErrorState error={resources.error} onRetry={() => void resources.refetch()} /> : resources.data?.length ? <div className="space-y-2">{resources.data.map((resource) => <div key={resource.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"><div><p className="text-sm font-medium">{resource.name}</p><p className="text-xs text-muted-foreground">{resource.kind} · {resource.status} · capacity {resource.capacity}{resource.location ? ` · ${resource.location}` : ""}{resource.requiresApproval ? " · approval required" : ""}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => open(resource)}>Edit</Button>{resource.status !== "retired" ? <Button size="sm" variant="outline" onClick={() => { setMaintenanceTarget(resource); setForm(null); setError(null); }}>Maintenance</Button> : null}</div></div>)}</div> : <p className="text-sm text-muted-foreground">No rooms or equipment yet.</p>}
  </section>;
}
