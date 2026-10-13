"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissionGate } from "@/hooks/api/access";
import { useHydrated } from "@/hooks/common/use-hydrated";
import { clearOfflineCalendarSnapshot, readOfflineCalendarSnapshot, subscribeOfflineCalendarClear, type OfflineCalendarSnapshot } from "@/lib/offline/calendar-offline-cache";
import type { CalendarListItem } from "@/hooks/api/calendar";
import type { CalendarOfflineEditIntent, CalendarOfflineIntent } from "./calendar-offline-intent";

const IDENTITY_KEY = "streamline-calendar-offline-identity";

function subscribeClock(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
}

function clockMinute(): number {
  return Math.ceil(Date.now() / 60_000) * 60_000;
}

function serverClockMinute(): number {
  return 0;
}

function cachedOfflineIdentity(): string {
  try { return sessionStorage.getItem("streamline-calendar-offline-session-identity") ?? ""; }
  catch { return ""; }
}

function serverOfflineIdentity(): string {
  return "";
}

export function CalendarOfflinePanel({ onQueueIntent, queued, loadedEvents, onQueueEditIntent, editQueued }: {
  onQueueIntent: (intent: CalendarOfflineIntent) => void;
  queued: boolean;
  loadedEvents: CalendarListItem[];
  onQueueEditIntent: (intent: CalendarOfflineEditIntent) => void;
  editQueued: boolean;
}) {
  const { data: session, status } = useSession();
  const access = usePermissionGate("calendar:read");
  const cachedIdentity = useSyncExternalStore(subscribeOfflineCalendarClear, cachedOfflineIdentity, serverOfflineIdentity);
  const markerReady = useHydrated();
  const sessionIdentity = session?.orgId && session.user?.id ? `${session.orgId}:${session.user.id}` : "";
  const identity = sessionIdentity || cachedIdentity;
  const canRead = access.allowed || (typeof navigator !== "undefined" && !navigator.onLine && !access.denied && Boolean(cachedIdentity) && (!sessionIdentity || sessionIdentity === cachedIdentity));
  const [snapshot, setSnapshot] = useState<OfflineCalendarSnapshot | null>(null);
  const now = useSyncExternalStore(subscribeClock, clockMinute, serverClockMinute);
  const [loading, setLoading] = useState(true);
  const [draftStart, setDraftStart] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [draftEnd, setDraftEnd] = useState(() => format(new Date(Date.now() + 60 * 60_000), "yyyy-MM-dd'T'HH:mm"));
  const [editOccurrenceId, setEditOccurrenceId] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const editable = loadedEvents.filter((event) => event.source === "event" && event.actions.edit && event.timeKind === "timed" && !event.allDay && Boolean(event.sourceVersion) && event.freshness.state === "fresh");
  const selectedEdit = editable.find((event) => event.occurrenceId === editOccurrenceId);
  useEffect(() => subscribeOfflineCalendarClear(() => setSnapshot(null)), []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!markerReady) return;
      if ((status === "unauthenticated" && navigator.onLine) || !identity || !canRead) {
        await clearOfflineCalendarSnapshot().catch(() => undefined);
        if (active) { setSnapshot(null); setLoading(false); }
        return;
      }
      try {
        const previous = localStorage.getItem(IDENTITY_KEY);
        if (!access.allowed && previous !== identity) {
          await clearOfflineCalendarSnapshot();
          if (active) { setSnapshot(null); setLoading(false); }
          return;
        }
        if (previous && previous !== identity) await clearOfflineCalendarSnapshot();
        const value = await readOfflineCalendarSnapshot(identity);
        if (active) { setSnapshot(value); setLoading(false); }
      } catch {
        if (active) { setSnapshot(null); setLoading(false); }
      }
    };
    void load();
    return () => { active = false; };
  }, [identity, canRead, access.allowed, status, markerReady]);
  const ageMs = snapshot ? now - snapshot.fetchedAt : null;
  const expired = ageMs === null || ageMs > (snapshot?.maxAgeDays ?? 0) * 86_400_000;
  const age = ageMs === null ? "" : ageMs < 3_600_000 ? `${Math.max(1, Math.floor(ageMs / 60_000))} minutes` :
    ageMs < 86_400_000 ? `${Math.floor(ageMs / 3_600_000)} hours` : `${Math.floor(ageMs / 86_400_000)} days`;
  return <PageWrapper title="Calendar offline">
    <div className="space-y-4 p-4">
      <div className="rounded-md border p-4"><p className="font-medium">Offline read only</p><p className="text-sm text-muted-foreground">Availability and permissions may have changed. Booking, editing, provider sync, and source actions require reconnection and fresh confirmation.</p></div>
      {loading ? <p className="text-sm text-muted-foreground">Checking saved schedule</p> :
        !canRead || !identity ? <p className="text-sm text-muted-foreground">Sign in with Calendar access to view a saved schedule.</p> :
        expired ? <p className="text-sm text-muted-foreground">No recent offline schedule is available. Reconnect to refresh it.</p> : snapshot ? <>
          <p className="text-sm text-muted-foreground">Saved {age} ago · {snapshot.coverage} coverage · {new Date(snapshot.windowStart).toLocaleDateString()} to {new Date(snapshot.windowEnd).toLocaleDateString()}</p>
          <div className="space-y-1"><h2 className="text-sm font-semibold">Source coverage at last refresh</h2>{snapshot.sources.map((source) => <p key={source.sourceKey} className="text-xs text-muted-foreground">{source.sourceKey}: {source.state}, {age} old</p>)}</div>
          <div className="space-y-2"><h2 className="text-sm font-semibold">Saved busy windows</h2>{snapshot.windows.length === 0 ? <p className="text-sm text-muted-foreground">No busy windows were saved.</p> :
            snapshot.windows.map((window, index) => <div key={`${window.start}-${window.end}-${index}`} className="rounded-md border px-3 py-2 text-sm"><span className="font-medium">Busy</span><span className="ml-2 text-muted-foreground">{new Date(window.start).toLocaleString()} – {new Date(window.end).toLocaleString()}</span></div>)}</div>
          <div className="space-y-3 rounded-md border p-3"><h2 className="text-sm font-semibold">Draft a new time block</h2><p className="text-xs text-muted-foreground">This draft stays in this tab. Reconnection will check your account, current policy, and availability before you can open the event form.</p>
            <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="offline-draft-start">Start</Label><Input id="offline-draft-start" type="datetime-local" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="offline-draft-end">End</Label><Input id="offline-draft-end" type="datetime-local" value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} /></div></div>
            <Button variant="outline" disabled={queued || editQueued || !Number.isFinite(new Date(draftStart).getTime()) || !Number.isFinite(new Date(draftEnd).getTime()) || new Date(draftEnd) <= new Date(draftStart)} onClick={() => onQueueIntent({ identity, start: new Date(draftStart).toISOString(), end: new Date(draftEnd).toISOString(), policyVersion: snapshot.policyVersion, createdAt: Date.now() })}>{queued ? "Draft queued for review" : "Review after reconnecting"}</Button>
          </div>
          {editable.length ? <div className="space-y-3 rounded-md border p-3"><h2 className="text-sm font-semibold">Draft a change to a loaded Calendar event</h2><p className="text-xs text-muted-foreground">Only events already loaded in this tab are available. Names and record IDs stay hidden offline. The current occurrence and permission will be checked again after reconnecting.</p>
            <select aria-label="Previously loaded event" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editOccurrenceId} onChange={(change) => { const next = editable.find((event) => event.occurrenceId === change.target.value); setEditOccurrenceId(change.target.value); setEditStart(next ? format(new Date(next.start), "yyyy-MM-dd'T'HH:mm") : ""); setEditEnd(next ? format(new Date(next.end), "yyyy-MM-dd'T'HH:mm") : ""); }}><option value="">Select a busy window</option>{editable.map((event, index) => <option key={event.occurrenceId} value={event.occurrenceId}>Calendar event {index + 1} · {new Date(event.start).toLocaleString()}</option>)}</select>
            <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="offline-edit-start">New start</Label><Input id="offline-edit-start" type="datetime-local" value={editStart} onChange={(change) => setEditStart(change.target.value)} /></div><div className="space-y-1"><Label htmlFor="offline-edit-end">New end</Label><Input id="offline-edit-end" type="datetime-local" value={editEnd} onChange={(change) => setEditEnd(change.target.value)} /></div></div>
            <Button variant="outline" disabled={queued || editQueued || !selectedEdit || !Number.isFinite(new Date(editStart).getTime()) || !Number.isFinite(new Date(editEnd).getTime()) || new Date(editEnd) <= new Date(editStart) || (selectedEdit && new Date(editStart).getTime() === new Date(selectedEdit.start).getTime() && new Date(editEnd).getTime() === new Date(selectedEdit.end).getTime())} onClick={() => { if (selectedEdit?.sourceVersion) onQueueEditIntent({ identity, sourceRecordId: selectedEdit.sourceRecordId, occurrenceId: selectedEdit.occurrenceId, expectedSourceVersion: selectedEdit.sourceVersion, originalStart: selectedEdit.start, originalEnd: selectedEdit.end, start: new Date(editStart).toISOString(), end: new Date(editEnd).toISOString(), policyVersion: snapshot.policyVersion, createdAt: Date.now() }); }}>{editQueued ? "Change queued for review" : "Review change after reconnecting"}</Button>
          </div> : null}
        </> : <p className="text-sm text-muted-foreground">No offline schedule has been saved for this account.</p>}
    </div>
  </PageWrapper>;
}
