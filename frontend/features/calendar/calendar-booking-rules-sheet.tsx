"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
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
  return <div className="space-y-3"><Button type="button" variant="outline" onClick={onBack}>Back to pages</Button><h3 className="font-medium">Preview: {rule.title}</h3>{preview.access.denied ? <p className="text-sm text-muted-foreground">You do not have access to this preview.</p> : preview.access.unavailable ? <ErrorState title="Preview unavailable" onRetry={() => void preview.refetch()} /> : preview.access.pending || preview.isPending ? <p role="status">Checking available times…</p> : preview.isError ? <ErrorState error={preview.error} onRetry={() => void preview.refetch()} /> : <><p className="text-sm text-muted-foreground">{preview.data?.message}</p>{preview.data?.slots.length ? <div className="max-h-64 space-y-2 overflow-y-auto">{preview.data.slots.map((slot) => <div key={slot.start} className="rounded-md border p-2 text-sm">{slot.localStart} – {slot.localEnd}</div>)}</div> : null}</>}</div>;
}

export function CalendarBookingRulesSheet({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const identity = `${session?.orgId ?? ""}:${session?.user?.id ?? ""}`;
  return <CalendarBookingRulesSheetInner key={identity} identity={identity} onClose={onClose} />;
}

function CalendarBookingRulesSheetInner({ identity, onClose }: { identity: string; onClose: () => void }) {
  const rules = useCalendarBookingRules();
  const create = useCreateCalendarBookingRule();
  const update = useUpdateCalendarBookingRule();
  const activate = useActivateCalendarBookingRule();
  const pause = useChangeCalendarBookingRuleStatus("pause");
  const revoke = useChangeCalendarBookingRuleStatus("revoke");
  const [editing, setEditing] = useState<CalendarBookingRule | null>(null);
  const [form, setForm] = useState<CalendarBookingRuleInput | null>(null);
  const [publicLink, setPublicLink] = useState<{ identity: string; href: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [previewRule, setPreviewRule] = useState<CalendarBookingRule | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (!window.confirm(`Revoke “${rule.title}”? Its public link will stop working.`)) return;
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

  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent className="flex flex-col sm:max-w-xl">
      <SheetHeader><SheetTitle>Booking pages</SheetTitle></SheetHeader>
      <SheetBody className="space-y-5 overflow-y-auto px-4 py-3">
        {error ? <div role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</div> : null}
        {publicLink?.identity === identity ? <div className="space-y-2 rounded-md border p-3"><p className="text-sm font-medium">Your public booking link</p><Input readOnly value={publicLink.href} aria-label="Public booking link" /><Button type="button" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(publicLink.href); toast.success("Link copied"); } catch { toast.error("Could not copy the link"); } }}>Copy link</Button><p className="text-xs text-muted-foreground">Save this link now. It is shown only when the page is first activated.</p></div> : null}
        {previewRule ? <BookingRulePreview rule={previewRule} onBack={() => setPreviewRule(null)} /> : form ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="space-y-1"><Label htmlFor="booking-title">Title</Label><Input id="booking-title" maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div>
          <div className="space-y-1"><Label htmlFor="booking-description">Description</Label><Input id="booking-description" maxLength={2000} value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value || null })} /></div>
          <div className="grid grid-cols-2 gap-3">{numeric("durationMinutes", "Duration (minutes)", 5, 480)}{numeric("slotIntervalMinutes", "Slot interval (minutes)", 5, 240)}{numeric("minimumNoticeMinutes", "Minimum notice (minutes)", 0, 525600)}{numeric("maximumAdvanceDays", "Book ahead (days)", 1, 365)}{numeric("bufferBeforeMinutes", "Buffer before (minutes)", 0, 1440)}{numeric("bufferAfterMinutes", "Buffer after (minutes)", 0, 1440)}{numeric("dailyLimit", "Daily limit", 1, 100)}{numeric("cancellationNoticeMinutes", "Cancellation notice (minutes)", 0, 525600)}{numeric("rescheduleNoticeMinutes", "Reschedule notice (minutes)", 0, 525600)}</div>
          <div className="space-y-1"><Label htmlFor="booking-timezone">Time zone</Label><Input id="booking-timezone" value={form.timeZone} onChange={(event) => setForm({ ...form, timeZone: event.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="booking-expiry">Link expires (optional)</Label><Input id="booking-expiry" type="datetime-local" value={localDateTime(form.linkExpiresAt)} onChange={(event) => setForm({ ...form, linkExpiresAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></div>
          <fieldset className="space-y-3"><legend className="text-sm font-medium">Working hours</legend>{form.workingHours.map((window, index) => <div key={index} className="flex items-center gap-2"><select aria-label={`Window ${index + 1} day`} className="rounded-md border bg-background p-2 text-sm" value={window.weekday} onChange={(event) => setForm({ ...form, workingHours: form.workingHours.map((item, position) => position === index ? { ...item, weekday: Number(event.target.value) } : item) })}>{days.map((day, dayIndex) => <option key={day} value={dayIndex + 1}>{day}</option>)}</select><Input type="time" aria-label={`Window ${index + 1} start`} value={window.start} onChange={(event) => setForm({ ...form, workingHours: form.workingHours.map((item, position) => position === index ? { ...item, start: event.target.value } : item) })} /><Input type="time" aria-label={`Window ${index + 1} end`} value={window.end} onChange={(event) => setForm({ ...form, workingHours: form.workingHours.map((item, position) => position === index ? { ...item, end: event.target.value } : item) })} /><Button type="button" variant="outline" onClick={() => setForm({ ...form, workingHours: form.workingHours.filter((_, position) => position !== index) })}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={form.workingHours.length >= 28} onClick={() => setForm({ ...form, workingHours: [...form.workingHours, { weekday: 1, start: "09:00", end: "17:00" }] })}>Add hours</Button></fieldset>
          <fieldset className="space-y-3"><legend className="text-sm font-medium">Visitor questions</legend>{form.intakeFields.map((field, index) => <div key={index} className="space-y-2 rounded-md border p-2"><div className="flex gap-2"><Input aria-label={`Question ${index + 1} label`} placeholder="Question label" value={field.label} onChange={(event) => setForm({ ...form, intakeFields: form.intakeFields.map((item, position) => position === index ? { ...item, label: event.target.value } : item) })} /><Button type="button" variant="outline" onClick={() => setForm({ ...form, intakeFields: form.intakeFields.filter((_, position) => position !== index) })}>Remove</Button></div><div className="flex items-center gap-2"><select aria-label={`Question ${index + 1} type`} className="rounded-md border bg-background p-2 text-sm" value={field.type} onChange={(event) => setForm({ ...form, intakeFields: form.intakeFields.map((item, position) => position === index ? { ...item, type: event.target.value as typeof field.type, options: event.target.value === "select" ? ["Option 1"] : undefined } : item) })}><option value="text">Short text</option><option value="textarea">Long text</option><option value="email">Email</option><option value="phone">Phone</option><option value="select">Choice</option></select><label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={field.required} onChange={(event) => setForm({ ...form, intakeFields: form.intakeFields.map((item, position) => position === index ? { ...item, required: event.target.checked } : item) })} />Required</label></div>{field.type === "select" ? <Input aria-label={`Question ${index + 1} choices`} placeholder="Choices separated by commas" value={field.options?.join(", ") ?? ""} onChange={(event) => setForm({ ...form, intakeFields: form.intakeFields.map((item, position) => position === index ? { ...item, options: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : item) })} /> : null}</div>)}<Button type="button" variant="outline" disabled={form.intakeFields.length >= 12} onClick={() => setForm({ ...form, intakeFields: [...form.intakeFields, { key: `question_${Date.now().toString(36)}`, label: "", type: "text", required: false }] })}>Add question</Button></fieldset>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresApproval} onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })} />Require approval before confirming</label>
          <div className="flex gap-2"><Button type="submit" disabled={create.isPending || update.isPending}>Save booking page</Button><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button></div>
        </form> : <>
          {rules.access.allowed ? <Button onClick={() => edit(null)}>New booking page</Button> : null}
          {rules.access.denied ? <p className="text-sm text-muted-foreground">You do not have access to booking pages.</p> : rules.access.unavailable ? <ErrorState title="Booking pages unavailable" onRetry={() => void rules.refetch()} /> : rules.access.pending || rules.isPending ? <p role="status">Loading booking pages…</p> : rules.isError ? <ErrorState error={rules.error} onRetry={() => void rules.refetch()} /> : rules.data?.length ? <div className="space-y-3">{rules.data.map((rule) => <div key={rule.id} className="space-y-2 rounded-md border p-3"><div className="flex items-center justify-between gap-2"><p className="font-medium">{rule.title}</p><span className="text-xs capitalize text-muted-foreground">{rule.status}</span></div><p className="text-sm text-muted-foreground">{rule.durationMinutes} minutes · {rule.timeZone} · Version {rule.version}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => edit(rule)} disabled={rule.status === "revoked"}>Edit</Button><Button size="sm" variant="outline" onClick={() => setPreviewRule(rule)}>Preview</Button>{rule.status === "draft" || rule.status === "paused" ? <Button size="sm" onClick={() => void changeStatus(rule, "activate")} disabled={busyId === rule.id}>Activate</Button> : null}{rule.status === "active" ? <Button size="sm" variant="outline" onClick={() => void changeStatus(rule, "pause")} disabled={busyId === rule.id}>Pause</Button> : null}{rule.status !== "revoked" ? <Button size="sm" variant="destructive" onClick={() => void changeStatus(rule, "revoke")} disabled={busyId === rule.id}>Revoke</Button> : null}</div></div>)}</div> : <p className="text-sm text-muted-foreground">Create a booking page to offer available time slots.</p>}
        </>}
      </SheetBody>
    </SheetContent>
  </Sheet>;
}
