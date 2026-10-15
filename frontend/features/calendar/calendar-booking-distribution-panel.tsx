"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { CalendarBookingRule } from "@/hooks/api/calendar/booking-rules-schema";
import {
  useBookingDistribution,
  useBookingAccessLinks,
  useBookingDistributionOperations,
  useCreateBookingAccessLink,
  useRevokeBookingAccessLink,
  useSaveBookingDistribution,
  type BookingDistributionInput,
} from "@/hooks/api/calendar/booking-distribution";
import type { BookingDistribution } from "@/hooks/api/calendar/booking-distribution-schema";
import { calendarBookingEmbedCode } from "./calendar-booking-embed-code";
import { CalendarDateTimePicker } from "./calendar-date-time-picker";

function initialDistribution(rule: CalendarBookingRule, current: BookingDistribution | null): BookingDistributionInput {
  if (current) return {
    expectedVersion: current.version,
    defaultLocale: current.defaultLocale,
    localizedCopy: current.localizedCopy,
    branding: current.branding,
    allowedOrigins: current.allowedOrigins,
    callbackFacts: current.callbackFacts,
    intakeKeys: [...new Set([...current.intakeKeys, ...rule.intakeFields.filter((field) => field.required).map((field) => field.key)])],
    consentRequired: current.consentRequired,
    minimumCompletionSeconds: current.minimumCompletionSeconds,
    maximumSessionAttempts: current.maximumSessionAttempts,
  };
  return {
    expectedVersion: null,
    defaultLocale: "en-US",
    localizedCopy: [{ locale: "en-US", title: rule.title, description: rule.description, consentLabel: null, fieldLabels: {} }],
    branding: { displayName: null, logoUrl: null, primaryColor: null, showPoweredBy: true },
    allowedOrigins: [],
    callbackFacts: ["outcome"],
    intakeKeys: rule.intakeFields.filter((field) => field.required).map((field) => field.key),
    consentRequired: false,
    minimumCompletionSeconds: 2,
    maximumSessionAttempts: 8,
  };
}

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function CalendarBookingDistributionPanel({ rule, onBack }: { rule: CalendarBookingRule; onBack: () => void }) {
  const canWrite = useCan("calendar:write");
  const distribution = useBookingDistribution(rule.id);
  const links = useBookingAccessLinks(rule.id, distribution.data !== null && distribution.data !== undefined);
  const operations = useBookingDistributionOperations(rule.id, distribution.data !== null && distribution.data !== undefined);
  const saveDistribution = useSaveBookingDistribution(rule.id);
  const createLink = useCreateBookingAccessLink(rule.id);
  const revokeLink = useRevokeBookingAccessLink(rule.id);
  const [draft, setDraft] = useState<BookingDistributionInput | null>(null);
  const [channel, setChannel] = useState<"page" | "embed">("page");
  const [allowedOrigin, setAllowedOrigin] = useState("");
  const [singleUse, setSingleUse] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [source, setSource] = useState("");
  const [issuedLink, setIssuedLink] = useState<{ id: string; href: string; channel: "page" | "embed"; origin: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = distribution.data;
  const form = draft ?? initialDistribution(rule, current ?? null);

  function change(next: BookingDistributionInput) {
    setDraft(next);
    setError(null);
  }

  async function save() {
    if (!form.localizedCopy.some((copy) => copy.locale.toLowerCase() === form.defaultLocale.toLowerCase())) {
      setError("Add copy for the default language.");
      return;
    }
    try {
      await saveDistribution.mutateAsync({
        ...form,
        allowedOrigins: form.allowedOrigins.map((origin) => origin.trim()).filter(Boolean),
        localizedCopy: form.localizedCopy.map((copy) => ({
          ...copy,
          fieldLabels: Object.fromEntries(Object.entries(copy.fieldLabels)
            .filter(([key, value]) => form.intakeKeys.includes(key) && value.trim())
            .map(([key, value]) => [key, value.trim()])),
        })),
      });
      setDraft(null);
      setIssuedLink(null);
      setError(null);
      toast.success("Booking page distribution saved");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function issueLink() {
    if (!current) return;
    if (channel === "embed" && !allowedOrigin) {
      setError("Choose an approved embed origin.");
      return;
    }
    try {
      const created = await createLink.mutateAsync({
        expectedDistributionVersion: current.version,
        channel,
        allowedOrigin: channel === "embed" ? allowedOrigin : null,
        singleUse,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        attribution: { source: source.trim() || null, medium: null, campaign: null, content: null, term: null, referrerDomain: null },
      });
      setIssuedLink({ id: created.id, href: `${window.location.origin}/calendar/book/${encodeURIComponent(created.token)}`, channel, origin: channel === "embed" ? allowedOrigin : null });
      setError(null);
      toast.success("Booking link created");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function revoke(linkId: string) {
    if (!window.confirm("Revoke this booking link? It will stop accepting new visitors.")) return;
    try {
      await revokeLink.mutateAsync(linkId);
      if (issuedLink?.id === linkId) setIssuedLink(null);
      setError(null);
      toast.success("Booking link revoked");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return <div className="space-y-5">
    <Button variant="outline" onClick={onBack}>Back to booking pages</Button>
    <div><h3 className="font-medium">Publish {rule.title}</h3><p className="text-sm text-muted-foreground">Configure the public page and approved embeds before creating links.</p></div>
    {error ? <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p> : null}
    {distribution.access.denied ? <p>You do not have access to this booking page.</p> : distribution.access.unavailable ? <ErrorState title="Distribution unavailable" onRetry={() => void distribution.refetch()} /> : distribution.access.pending || distribution.isPending ? <p role="status">Loading distribution…</p> : distribution.isError ? <ErrorState error={distribution.error} onRetry={() => void distribution.refetch()} /> : <>
      <section className="space-y-3 rounded-md border p-3" aria-label="Page and embed settings">
        <div className="space-y-1"><Label htmlFor="distribution-locale">Default language</Label><Input id="distribution-locale" value={form.defaultLocale} onChange={(event) => change({ ...form, defaultLocale: event.target.value })} /></div>
        {form.localizedCopy.map((copy, index) => <div key={index} className="space-y-2 rounded-md border p-2">
          <div className="flex gap-2"><Input aria-label={`Language ${index + 1}`} value={copy.locale} onChange={(event) => change({ ...form, localizedCopy: form.localizedCopy.map((item, position) => position === index ? { ...item, locale: event.target.value } : item) })} /><Button type="button" variant="outline" disabled={form.localizedCopy.length === 1} onClick={() => change({ ...form, localizedCopy: form.localizedCopy.filter((_, position) => position !== index) })}>Remove</Button></div>
          <Input aria-label={`Page title ${copy.locale}`} placeholder="Page title" value={copy.title ?? ""} onChange={(event) => change({ ...form, localizedCopy: form.localizedCopy.map((item, position) => position === index ? { ...item, title: event.target.value || null } : item) })} />
          <Textarea aria-label={`Page description ${copy.locale}`} placeholder="Page description" value={copy.description ?? ""} onChange={(event) => change({ ...form, localizedCopy: form.localizedCopy.map((item, position) => position === index ? { ...item, description: event.target.value || null } : item) })} />
          <Input aria-label={`Consent label ${copy.locale}`} placeholder="Consent label" value={copy.consentLabel ?? ""} onChange={(event) => change({ ...form, localizedCopy: form.localizedCopy.map((item, position) => position === index ? { ...item, consentLabel: event.target.value || null } : item) })} />
          {rule.intakeFields.filter((field) => form.intakeKeys.includes(field.key)).map((field) => <Input key={field.key} aria-label={`${field.label} label ${copy.locale}`} placeholder={`${field.label} label`} value={copy.fieldLabels[field.key] ?? ""} onChange={(event) => change({ ...form, localizedCopy: form.localizedCopy.map((item, position) => position === index ? { ...item, fieldLabels: { ...item.fieldLabels, [field.key]: event.target.value } } : item) })} />)}
        </div>)}
        <Button type="button" variant="outline" disabled={form.localizedCopy.length >= 20} onClick={() => change({ ...form, localizedCopy: [...form.localizedCopy, { locale: "", title: null, description: null, consentLabel: null, fieldLabels: {} }] })}>Add language</Button>
        <div className="space-y-1"><Label htmlFor="distribution-display-name">Brand name</Label><Input id="distribution-display-name" value={form.branding.displayName ?? ""} onChange={(event) => change({ ...form, branding: { ...form.branding, displayName: event.target.value || null } })} /></div>
        <div className="space-y-1"><Label htmlFor="distribution-logo">HTTPS logo URL</Label><Input id="distribution-logo" type="url" value={form.branding.logoUrl ?? ""} onChange={(event) => change({ ...form, branding: { ...form.branding, logoUrl: event.target.value || null } })} /></div>
        <div className="space-y-1"><Label htmlFor="distribution-color">Brand color</Label><Input id="distribution-color" type="color" value={form.branding.primaryColor ?? "#2563eb"} onChange={(event) => change({ ...form, branding: { ...form.branding, primaryColor: event.target.value } })} /></div>
        <Label className="flex items-center gap-2 text-sm font-normal"><Checkbox checked={form.branding.showPoweredBy} onCheckedChange={(checked) => change({ ...form, branding: { ...form.branding, showPoweredBy: checked === true } })} />Show StreamlineOS credit</Label>
        <div className="space-y-1"><Label htmlFor="distribution-origins">Approved embed origins</Label><Textarea id="distribution-origins" placeholder="https://example.com" value={form.allowedOrigins.join("\n")} onChange={(event) => change({ ...form, allowedOrigins: event.target.value.split("\n") })} /><p className="text-xs text-muted-foreground">One exact HTTPS origin per line.</p></div>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">Visitor questions</legend>{rule.intakeFields.map((field) => <Label key={field.key} className="flex items-center gap-2 text-sm font-normal"><Checkbox checked={form.intakeKeys.includes(field.key)} disabled={field.required} onCheckedChange={(checked) => change({ ...form, intakeKeys: checked === true ? [...form.intakeKeys, field.key] : form.intakeKeys.filter((key) => key !== field.key) })} />{field.label}{field.required ? " (required)" : ""}</Label>)}</fieldset>
        <Label className="flex items-center gap-2 text-sm font-normal"><Checkbox checked={form.consentRequired} onCheckedChange={(checked) => change({ ...form, consentRequired: checked === true })} />Require visitor consent</Label>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">Embed callback facts</legend>{(["outcome", "bookingId", "start", "end"] as const).map((fact) => <Label key={fact} className="flex items-center gap-2 text-sm font-normal"><Checkbox checked={form.callbackFacts.includes(fact)} disabled={fact === "outcome" && form.callbackFacts.length === 1} onCheckedChange={(checked) => change({ ...form, callbackFacts: checked === true ? [...form.callbackFacts, fact] : form.callbackFacts.filter((item) => item !== fact) })} />{fact}</Label>)}</fieldset>
        <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="distribution-delay">Minimum completion time (seconds)</Label><Input id="distribution-delay" type="number" min={0} max={120} value={form.minimumCompletionSeconds} onChange={(event) => change({ ...form, minimumCompletionSeconds: Number(event.target.value) })} /></div><div className="space-y-1"><Label htmlFor="distribution-attempts">Maximum session attempts</Label><Input id="distribution-attempts" type="number" min={1} max={30} value={form.maximumSessionAttempts} onChange={(event) => change({ ...form, maximumSessionAttempts: Number(event.target.value) })} /></div></div>
        {canWrite ? <Button onClick={() => void save()} disabled={saveDistribution.isPending}>Save distribution settings</Button> : null}
      </section>
      {current ? <section className="space-y-3 rounded-md border p-3" aria-label="Booking links">
        {operations.data ? <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3"><p>Active links: {operations.data.activeLinks}</p><p>Used links: {operations.data.consumedLinks}</p><p>Revoked links: {operations.data.revokedLinks}</p><p>Visitors: {operations.data.sessions}</p><p>Blocked visits: {operations.data.blockedSessions}</p><p>Completed bookings: {operations.data.completedConversions}</p></div> : operations.isError || operations.access.unavailable ? <ErrorState title="Link activity unavailable" error={operations.error} onRetry={() => void operations.refetch()} /> : null}
        <h4 className="font-medium">Create a booking link</h4>
        <div className="space-y-1"><Label htmlFor="link-channel">Channel</Label><Select value={channel} onValueChange={(value) => setChannel(value === "embed" ? "embed" : "page")}><SelectTrigger id="link-channel" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="page">Public page</SelectItem><SelectItem value="embed">Approved embed</SelectItem></SelectContent></Select></div>
        {channel === "embed" ? <div className="space-y-1"><Label htmlFor="link-origin">Approved origin</Label><Select value={allowedOrigin} onValueChange={setAllowedOrigin}><SelectTrigger id="link-origin" className="w-full"><SelectValue placeholder="Choose an origin" /></SelectTrigger><SelectContent>{current.allowedOrigins.map((origin) => <SelectItem key={origin} value={origin}>{origin}</SelectItem>)}</SelectContent></Select></div> : null}
        <Label className="flex items-center gap-2 text-sm font-normal"><Checkbox checked={singleUse} onCheckedChange={(checked) => setSingleUse(checked === true)} />Single use</Label>
        <div className="space-y-1"><Label htmlFor="link-expiry">Expires (optional)</Label><CalendarDateTimePicker id="link-expiry" label="Expires" value={expiresAt} onChange={setExpiresAt} clearable /></div>
        <div className="space-y-1"><Label htmlFor="link-source">Attribution source (optional)</Label><Input id="link-source" value={source} onChange={(event) => setSource(event.target.value)} /></div>
        {canWrite ? <Button onClick={() => void issueLink()} disabled={createLink.isPending}>Create link</Button> : null}
        {issuedLink ? <div className="space-y-2 rounded-md border p-2"><p className="text-sm font-medium">Save this link now. Its token is shown once.</p><Input readOnly value={issuedLink.href} aria-label="New booking link" /><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(issuedLink.href); toast.success("Link copied"); } catch { toast.error("Could not copy the link"); } }}>Copy link</Button>{issuedLink.channel === "embed" ? <div className="space-y-2"><p className="text-xs text-muted-foreground">Embed on {issuedLink.origin}.</p><Textarea readOnly aria-label="Booking embed code" value={calendarBookingEmbedCode(issuedLink.href)} /><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(calendarBookingEmbedCode(issuedLink.href)); toast.success("Embed code copied"); } catch { toast.error("Could not copy the embed code"); } }}>Copy embed code</Button></div> : null}</div> : null}
        {links.access.denied ? <p className="text-sm">Links are unavailable to this account.</p> : links.access.unavailable ? <ErrorState title="Links unavailable" onRetry={() => void links.refetch()} /> : links.access.pending || links.isPending ? <p role="status">Loading links…</p> : links.isError ? <ErrorState error={links.error} onRetry={() => void links.refetch()} /> : links.data?.length ? <div className="space-y-2">{links.data.map((link) => <div key={link.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"><span>{link.channel} · {link.status} · {link.singleUse ? "single use" : "reusable"}{link.expiresAt ? ` · expires ${localDateTime(link.expiresAt)}` : ""}</span>{link.status === "active" && canWrite ? <Button size="sm" variant="outline" onClick={() => void revoke(link.id)} disabled={revokeLink.isPending}>Revoke</Button> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">No links yet.</p>}
      </section> : null}
    </>}
  </div>;
}
