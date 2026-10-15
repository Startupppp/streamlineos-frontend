"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppSheet } from "@/components/shared/app-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useCursorPager } from "@/components/ui/table-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useActivateCalendarBookingRule,
  useCalendarBookingRules,
  useCalendarBookingRulePreview,
  useChangeCalendarBookingRuleStatus,
  useCreateCalendarBookingRule,
  useUpdateCalendarBookingRule,
  type CalendarBookingRuleInput,
} from "@/hooks/api/calendar/booking-rules";
import type { CalendarBookingRule } from "@/hooks/api/calendar/booking-rules-schema";
import { useCalendarBookingResources, useCalendarBookingRuleResources } from "@/hooks/api/calendar/booking-resources";
import type { BookingRuleResource } from "@/hooks/api/calendar/booking-resources-schema";
import { CalendarBookingDistributionPanel } from "./calendar-booking-distribution-panel";
import { CalendarSchedulingPollsPanel } from "./calendar-scheduling-polls-panel";
import { CalendarPollInvitationsPanel } from "./calendar-poll-invitations-panel";
import { CalendarBookingRoutingPanel } from "./calendar-booking-routing-panel";
import { CalendarBookingPaymentsPanel } from "./calendar-booking-payments-panel";
import { CalendarManagedBookingsPanel } from "./calendar-managed-bookings-panel";
import { CalendarResourceApprovalQueue } from "./calendar-resource-approval-queue";
import { BookingPageCard } from "./calendar-booking-page-card";
import { CalendarDateTimePicker } from "./calendar-date-time-picker";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function initialRule(): CalendarBookingRuleInput {
  return {
    title: "",
    description: null,
    durationMinutes: 30,
    slotIntervalMinutes: 30,
    minimumNoticeMinutes: 60,
    maximumAdvanceDays: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    dailyLimit: 10,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    workingHours: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: "09:00", end: "17:00" })),
    intakeFields: [],
    cancellationNoticeMinutes: 60,
    rescheduleNoticeMinutes: 60,
    requiresApproval: false,
    linkExpiresAt: null,
    resources: [],
  };
}

function fromRule(rule: CalendarBookingRule): CalendarBookingRuleInput {
  return {
    title: rule.title,
    description: rule.description,
    durationMinutes: rule.durationMinutes,
    slotIntervalMinutes: rule.slotIntervalMinutes,
    minimumNoticeMinutes: rule.minimumNoticeMinutes,
    maximumAdvanceDays: rule.maximumAdvanceDays,
    bufferBeforeMinutes: rule.bufferBeforeMinutes,
    bufferAfterMinutes: rule.bufferAfterMinutes,
    dailyLimit: rule.dailyLimit,
    timeZone: rule.timeZone,
    workingHours: rule.workingHours,
    intakeFields: rule.intakeFields,
    cancellationNoticeMinutes: rule.cancellationNoticeMinutes,
    rescheduleNoticeMinutes: rule.rescheduleNoticeMinutes,
    requiresApproval: rule.requiresApproval,
    linkExpiresAt: rule.linkExpiresAt,
  };
}

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function BookingRulePreview({ rule, onBack }: { rule: CalendarBookingRule; onBack: () => void }) {
  const [{ from, to }] = useState(() => ({ from: new Date().toISOString(), to: new Date(Date.now() + 7 * 86_400_000).toISOString() }));
  const preview = useCalendarBookingRulePreview(rule.id, from, to);
  const slotFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: rule.timeZone });
  return <div className="space-y-3"><Button type="button" variant="outline" onClick={onBack}>Back to pages</Button><h3 className="font-medium">Preview: {rule.title}</h3>{preview.access.denied ? <p className="text-sm text-muted-foreground">You do not have access to this preview.</p> : preview.access.unavailable ? <ErrorState title="Preview unavailable" onRetry={() => void preview.refetch()} /> : preview.access.pending || preview.isPending ? <p role="status">Checking available times…</p> : preview.isError ? <ErrorState error={preview.error} onRetry={() => void preview.refetch()} /> : <><p className="text-sm text-muted-foreground">{preview.data?.message}</p>{preview.data?.slots.length ? <div className="max-h-64 space-y-2 overflow-y-auto" aria-label={`Available times in ${rule.timeZone}`}>{preview.data.slots.map((slot) => <div key={slot.start} className="rounded-md border p-2 text-sm">{slotFormatter.formatRange(new Date(slot.start), new Date(slot.end))}</div>)}</div> : null}</>}</div>;
}

export function CalendarBookingRulesSheet({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const identity = `${session?.orgId ?? ""}:${session?.user?.id ?? ""}`;
  return <CalendarBookingRulesSheetInner key={identity} identity={identity} onClose={onClose} />;
}

function CalendarBookingRulesSheetInner({ identity, onClose }: { identity: string; onClose: () => void }) {
  const [editing, setEditing] = useState<CalendarBookingRule | null>(null);
  const [form, setForm] = useState<CalendarBookingRuleInput | null>(null);
  const canWrite = useCan("calendar:write");
  const canManageCalendarResources = useCan("calendar:admin:manage");
  const canManageHrAssets = useCan("hr:assets:manage");
  const canManageInventoryEquipment = useCan("inventory:warehouses:manage");
  const rules = useCalendarBookingRules();
  const resourcePager = useCursorPager(identity);
  const resources = useCalendarBookingResources(resourcePager.cursor, form !== null);
  const ruleResources = useCalendarBookingRuleResources(editing?.id ?? null, form !== null);
  const create = useCreateCalendarBookingRule();
  const update = useUpdateCalendarBookingRule();
  const activate = useActivateCalendarBookingRule();
  const pause = useChangeCalendarBookingRuleStatus("pause");
  const revoke = useChangeCalendarBookingRuleStatus("revoke");
  const [publicLink, setPublicLink] = useState<{ identity: string; href: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [previewRule, setPreviewRule] = useState<CalendarBookingRule | null>(null);
  const [distributionRule, setDistributionRule] = useState<CalendarBookingRule | null>(null);
  const [pollRule, setPollRule] = useState<CalendarBookingRule | null>(null);
  const [routingRule, setRoutingRule] = useState<CalendarBookingRule | null>(null);
  const [paymentRule, setPaymentRule] = useState<CalendarBookingRule | null>(null);
  const [managedBookingsRule, setManagedBookingsRule] = useState<CalendarBookingRule | null>(null);
  const [pollInvitationsOpen, setPollInvitationsOpen] = useState(false);
  const [resourceApprovalsOpen, setResourceApprovalsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedResources = form?.resources ?? ruleResources.data ?? [];

  function setResourceRequirement(resourceId: number, requirement: BookingRuleResource | null) {
    if (!form) return;
    const without = selectedResources.filter((item) => item.resourceId !== resourceId);
    setForm({ ...form, resources: requirement ? [...without, requirement] : without });
  }

  function edit(rule: CalendarBookingRule | null) {
    setEditing(rule);
    setForm(rule ? fromRule(rule) : initialRule());
    setPublicLink(null);
    setError(null);
  }

  async function save() {
    if (!form) return;
    if (!form.title.trim()) return setError("Enter a title.");
    if (!form.workingHours.length) return setError("Choose at least one working day.");
    if (form.workingHours.some((window) => window.start >= window.end)) return setError("Working hours must end after they start.");
    if (form.intakeFields.some((field) => !field.label.trim() || (field.type === "select" && !field.options?.length))) return setError("Complete each visitor question and its choices.");
    if (editing && (!ruleResources.access.allowed || ruleResources.isPending || ruleResources.isError)) return setError("Load the booking page resources before saving.");
    setError(null);
    try {
      if (editing) await update.mutateAsync({ id: editing.id, expectedVersion: editing.version, input: form });
      else await create.mutateAsync(form);
      toast.success(editing ? "Booking page updated" : "Booking page created");
      setForm(null);
      setEditing(null);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function changeStatus(rule: CalendarBookingRule, action: "activate" | "pause" | "revoke") {
    setBusyId(rule.id);
    setError(null);
    try {
      if (action === "activate") {
        const result = await activate.mutateAsync(rule.id);
        if (result.publicToken) setPublicLink({ identity, href: `${window.location.origin}/calendar/book/${encodeURIComponent(result.publicToken)}` });
        toast.success("Booking page is active");
      } else if (action === "pause") {
        await pause.mutateAsync(rule.id);
        toast.success("Booking page paused");
      } else {
        await revoke.mutateAsync(rule.id);
        toast.success("Booking page revoked");
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  function numeric(key: keyof CalendarBookingRuleInput, label: string, min: number, max: number) {
    return <div className="space-y-1"><Label htmlFor={key}>{label}</Label><Input id={key} type="number" min={min} max={max} value={form?.[key] as number} onChange={(event) => setForm((current) => current ? { ...current, [key]: Number(event.target.value) } : null)} /></div>;
  }

  return <AppSheet
    open
    onOpenChange={(open) => { if (!open) onClose(); }}
    title="Booking pages"
    description="Share open times and manage who can book them."
    className="sm:max-w-xl"
  >
      <div className="space-y-4">
        {error ? <Alert variant="destructive"><AlertDescription className="col-span-2 col-start-1 text-sm text-destructive">{error}</AlertDescription></Alert> : null}
        {publicLink?.identity === identity ? <div className="space-y-2 rounded-lg bg-muted p-3 dark:border dark:border-background"><p className="text-sm font-medium">Your public booking link</p><Input readOnly value={publicLink.href} aria-label="Public booking link" /><Button type="button" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(publicLink.href); toast.success("Link copied"); } catch { toast.error("Could not copy the link"); } }}>Copy link</Button><p className="text-xs text-muted-foreground">Save this link now. It is shown only when the page is first activated.</p></div> : null}
        {managedBookingsRule ? <CalendarManagedBookingsPanel key={managedBookingsRule.id} rule={managedBookingsRule} onBack={() => setManagedBookingsRule(null)} /> : resourceApprovalsOpen ? <CalendarResourceApprovalQueue onBack={() => setResourceApprovalsOpen(false)} /> : paymentRule ? <CalendarBookingPaymentsPanel key={paymentRule.id} rule={paymentRule} onBack={() => setPaymentRule(null)} /> : routingRule ? <CalendarBookingRoutingPanel key={routingRule.id} rule={routingRule} onBack={() => setRoutingRule(null)} /> : pollInvitationsOpen ? <CalendarPollInvitationsPanel onBack={() => setPollInvitationsOpen(false)} /> : pollRule ? <CalendarSchedulingPollsPanel key={pollRule.id} rule={pollRule} onBack={() => setPollRule(null)} /> : distributionRule ? <CalendarBookingDistributionPanel key={distributionRule.id} rule={distributionRule} onBack={() => setDistributionRule(null)} /> : previewRule ? <BookingRulePreview rule={previewRule} onBack={() => setPreviewRule(null)} /> : form ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="space-y-1"><Label htmlFor="booking-title">Title</Label><Input id="booking-title" maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div>
          <div className="space-y-1"><Label htmlFor="booking-description">Description</Label><Input id="booking-description" maxLength={2000} value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value || null })} /></div>
          <div className="grid grid-cols-2 gap-3">{numeric("durationMinutes", "Duration (minutes)", 5, 480)}{numeric("slotIntervalMinutes", "Slot interval (minutes)", 5, 240)}{numeric("minimumNoticeMinutes", "Minimum notice (minutes)", 0, 525600)}{numeric("maximumAdvanceDays", "Book ahead (days)", 1, 365)}{numeric("bufferBeforeMinutes", "Buffer before (minutes)", 0, 1440)}{numeric("bufferAfterMinutes", "Buffer after (minutes)", 0, 1440)}{numeric("dailyLimit", "Daily limit", 1, 100)}{numeric("cancellationNoticeMinutes", "Cancellation notice (minutes)", 0, 525600)}{numeric("rescheduleNoticeMinutes", "Reschedule notice (minutes)", 0, 525600)}</div>
          <div className="space-y-1"><Label htmlFor="booking-timezone">Time zone</Label><Input id="booking-timezone" value={form.timeZone} onChange={(event) => setForm({ ...form, timeZone: event.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="booking-expiry">Link expires (optional)</Label><CalendarDateTimePicker id="booking-expiry" label="Link expires" value={localDateTime(form.linkExpiresAt)} onChange={(value) => setForm({ ...form, linkExpiresAt: value ? new Date(value).toISOString() : null })} clearable /></div>
          <fieldset className="space-y-3"><legend className="text-sm font-medium">Working hours</legend>{form.workingHours.map((window, index) => <div key={index} className="flex items-center gap-2"><Select value={String(window.weekday)} onValueChange={(value) => setForm({ ...form, workingHours: form.workingHours.map((item, position) => position === index ? { ...item, weekday: Number(value) } : item) })}><SelectTrigger aria-label={`Window ${index + 1} day`}><SelectValue /></SelectTrigger><SelectContent>{days.map((day, dayIndex) => <SelectItem key={day} value={String(dayIndex + 1)}>{day}</SelectItem>)}</SelectContent></Select><Input type="time" aria-label={`Window ${index + 1} start`} value={window.start} onChange={(event) => setForm({ ...form, workingHours: form.workingHours.map((item, position) => position === index ? { ...item, start: event.target.value } : item) })} /><Input type="time" aria-label={`Window ${index + 1} end`} value={window.end} onChange={(event) => setForm({ ...form, workingHours: form.workingHours.map((item, position) => position === index ? { ...item, end: event.target.value } : item) })} /><Button type="button" variant="outline" onClick={() => setForm({ ...form, workingHours: form.workingHours.filter((_, position) => position !== index) })}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={form.workingHours.length >= 28} onClick={() => setForm({ ...form, workingHours: [...form.workingHours, { weekday: 1, start: "09:00", end: "17:00" }] })}>Add hours</Button></fieldset>
          <fieldset className="space-y-3"><legend className="text-sm font-medium">Rooms and equipment</legend>
            {editing && ruleResources.access.denied ? <p className="text-sm text-muted-foreground">Required resources are unavailable to this account.</p> : editing && (ruleResources.access.pending || ruleResources.isPending) ? <p role="status" className="text-sm">Loading required resources…</p> : editing && (ruleResources.access.unavailable || ruleResources.isError) ? <ErrorState title="Required resources unavailable" error={ruleResources.error} onRetry={() => void ruleResources.refetch()} /> : resources.access.unavailable || resources.isError ? <ErrorState title="Rooms and equipment unavailable" error={resources.error} onRetry={() => void resources.refetch()} /> : resources.access.pending || resources.isPending ? <p role="status" className="text-sm">Loading rooms and equipment…</p> : resources.data?.items.length ? resources.data.items.filter((resource) => resource.status === "active" || selectedResources.some((item) => item.resourceId === resource.id)).map((resource) => {
              const selected = selectedResources.find((item) => item.resourceId === resource.id);
              return <div key={resource.id} className="space-y-2 rounded-md border p-2">
                <label className="flex items-center gap-2 text-sm"><Checkbox aria-label={resource.name} checked={!!selected} disabled={!selected && (resource.status !== "active" || selectedResources.length >= 20)} onCheckedChange={(checked) => setResourceRequirement(resource.id, checked === true ? { resourceId: resource.id, units: 1, minimumCapacity: 1, requiredLocation: null, requiredAccessibility: [] } : null)} /><span>{resource.name} · {resource.kind} · capacity {resource.capacity}{resource.ownership === "source" ? " · source owned" : ""}{resource.requiresApproval ? " · approval required" : ""}</span></label>
                {selected ? <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label htmlFor={`resource-${resource.id}-units`}>Units</Label><Input id={`resource-${resource.id}-units`} type="number" min={1} max={resource.divisible ? Math.min(resource.capacity, 100) : 1} value={selected.units} onChange={(event) => setResourceRequirement(resource.id, { ...selected, units: Number(event.target.value) })} /></div>
                  <div className="space-y-1"><Label htmlFor={`resource-${resource.id}-capacity`}>Minimum capacity</Label><Input id={`resource-${resource.id}-capacity`} type="number" min={1} max={Math.min(resource.capacity, 10000)} value={selected.minimumCapacity} onChange={(event) => setResourceRequirement(resource.id, { ...selected, minimumCapacity: Number(event.target.value) })} /></div>
                  <div className="space-y-1"><Label htmlFor={`resource-${resource.id}-location`}>Required location</Label><Input id={`resource-${resource.id}-location`} value={selected.requiredLocation ?? ""} onChange={(event) => setResourceRequirement(resource.id, { ...selected, requiredLocation: event.target.value || null })} /></div>
                  <div className="space-y-1"><Label htmlFor={`resource-${resource.id}-accessibility`}>Accessibility needs</Label><Input id={`resource-${resource.id}-accessibility`} value={selected.requiredAccessibility.join(", ")} onChange={(event) => setResourceRequirement(resource.id, { ...selected, requiredAccessibility: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></div>
                </div> : null}
              </div>;
            }) : <p className="text-sm text-muted-foreground">No rooms or equipment are available for this organization.</p>}
            {resources.data ? selectedResources.filter((requirement) => !resources.data.items.some((resource) => resource.id === requirement.resourceId)).map((requirement) => <div key={requirement.resourceId} className="flex items-center justify-between rounded-md border p-2 text-sm"><span>Selected resource on another page or unavailable</span><Button type="button" variant="outline" onClick={() => setResourceRequirement(requirement.resourceId, null)}>Remove</Button></div>) : null}
            {resourcePager.hasPrevious || resources.data?.nextCursor ? <CursorPageControls page={resourcePager.pageNumber} hasNext={Boolean(resources.data?.nextCursor)} disabled={resources.isFetching} onPrevious={resourcePager.goPrevious} onNext={() => resourcePager.goNext(resources.data?.nextCursor)} /> : null}
          </fieldset>
          <fieldset className="space-y-3"><legend className="text-sm font-medium">Visitor questions</legend>{form.intakeFields.map((field, index) => <div key={index} className="space-y-2 rounded-md border p-2"><div className="flex gap-2"><Input aria-label={`Question ${index + 1} label`} placeholder="Question label" value={field.label} onChange={(event) => setForm({ ...form, intakeFields: form.intakeFields.map((item, position) => position === index ? { ...item, label: event.target.value } : item) })} /><Button type="button" variant="outline" onClick={() => setForm({ ...form, intakeFields: form.intakeFields.filter((_, position) => position !== index) })}>Remove</Button></div><div className="flex items-center gap-2"><Select value={field.type} onValueChange={(value) => setForm({ ...form, intakeFields: form.intakeFields.map((item, position) => position === index ? { ...item, type: value === "textarea" || value === "email" || value === "phone" || value === "select" ? value : "text", options: value === "select" ? ["Option 1"] : undefined } : item) })}><SelectTrigger aria-label={`Question ${index + 1} type`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Short text</SelectItem><SelectItem value="textarea">Long text</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="phone">Phone</SelectItem><SelectItem value="select">Choice</SelectItem></SelectContent></Select><label className="flex items-center gap-1 text-sm"><Checkbox aria-label={`Question ${index + 1} required`} checked={field.required} onCheckedChange={(checked) => setForm({ ...form, intakeFields: form.intakeFields.map((item, position) => position === index ? { ...item, required: checked === true } : item) })} />Required</label></div>{field.type === "select" ? <Input aria-label={`Question ${index + 1} choices`} placeholder="Choices separated by commas" value={field.options?.join(", ") ?? ""} onChange={(event) => setForm({ ...form, intakeFields: form.intakeFields.map((item, position) => position === index ? { ...item, options: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : item) })} /> : null}</div>)}<Button type="button" variant="outline" disabled={form.intakeFields.length >= 12} onClick={() => setForm({ ...form, intakeFields: [...form.intakeFields, { key: `question_${Date.now().toString(36)}`, label: "", type: "text", required: false }] })}>Add question</Button></fieldset>
          <label className="flex items-center gap-2 text-sm"><Checkbox aria-label="Require approval before confirming" checked={form.requiresApproval} onCheckedChange={(checked) => setForm({ ...form, requiresApproval: checked === true })} />Require approval before confirming</label>
          <div className="flex gap-2"><Button type="submit" disabled={create.isPending || update.isPending}>Save booking page</Button><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button></div>
        </form> : <>
          <div className="flex flex-wrap gap-2">
            {rules.access.allowed && canWrite ? <Button onClick={() => edit(null)}>New booking page</Button> : null}
            {canManageCalendarResources || canManageHrAssets || canManageInventoryEquipment ? <Button variant="outline" onClick={() => setResourceApprovalsOpen(true)}>Resource approvals</Button> : null}
            <Button variant="outline" onClick={() => setPollInvitationsOpen(true)}>Poll invitations</Button>
          </div>
          {rules.access.denied ? <p className="text-sm text-muted-foreground">You do not have access to booking pages.</p> : rules.access.unavailable ? <ErrorState title="Booking pages unavailable" onRetry={() => void rules.refetch()} /> : rules.access.pending || rules.isPending ? <div role="status" aria-label="Loading booking pages" className="space-y-3"><Skeleton className="h-32 w-full rounded-lg" /><Skeleton className="h-32 w-full rounded-lg" /></div> : rules.isError ? <ErrorState error={rules.error} onRetry={() => void rules.refetch()} /> : rules.data?.length ? <div className="space-y-3">{rules.data.map((rule) => <BookingPageCard key={rule.id} rule={rule} busy={busyId === rule.id} onEdit={() => edit(rule)} onPreview={() => setPreviewRule(rule)} onDistribution={() => setDistributionRule(rule)} onPolls={() => setPollRule(rule)} onRouting={() => setRoutingRule(rule)} onPayments={() => setPaymentRule(rule)} onBookings={() => setManagedBookingsRule(rule)} onActivate={() => void changeStatus(rule, "activate")} onPause={() => void changeStatus(rule, "pause")} onRevoke={() => void changeStatus(rule, "revoke")} />)}</div> : <div className="rounded-lg bg-muted px-4 py-8 text-center dark:border dark:border-background"><p className="text-sm text-muted-foreground">Create a booking page to offer available time slots.</p></div>}
        </>}
      </div>
  </AppSheet>;
}
