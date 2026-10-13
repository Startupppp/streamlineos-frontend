"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { clearOfflineCalendarSnapshot, readOfflineCalendarSnapshot, type OfflineCalendarSnapshot } from "@/lib/offline/calendar-offline-cache";

const IDENTITY_KEY = "streamline-calendar-offline-identity";

export function CalendarOfflinePanel() {
  const { data: session, status } = useSession();
  const canRead = useCan("calendar:read");
  const identity = session?.orgId && session.user?.id ? `${session.orgId}:${session.user.id}` : "";
  const [snapshot, setSnapshot] = useState<OfflineCalendarSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (status === "unauthenticated" || !identity || !canRead) {
        await clearOfflineCalendarSnapshot().catch(() => undefined);
        if (active) { setSnapshot(null); setLoading(false); }
        return;
      }
      try {
        const previous = localStorage.getItem(IDENTITY_KEY);
        if (previous && previous !== identity) await clearOfflineCalendarSnapshot();
        localStorage.setItem(IDENTITY_KEY, identity);
        const value = await readOfflineCalendarSnapshot(identity);
        if (active) { setSnapshot(value); setLoading(false); }
      } catch {
        if (active) { setSnapshot(null); setLoading(false); }
      }
    };
    void load();
    return () => { active = false; };
  }, [identity, canRead, status]);
  const ageMs = snapshot ? Date.now() - snapshot.fetchedAt : null;
  const expired = ageMs === null || ageMs > 7 * 86_400_000;
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
        </> : <p className="text-sm text-muted-foreground">No offline schedule has been saved for this account.</p>}
    </div>
  </PageWrapper>;
}
