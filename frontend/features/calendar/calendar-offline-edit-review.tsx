"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { useCalendarOfflinePolicy } from "@/hooks/api/calendar-offline-policy";
import type { CalendarEventDetail, CalendarEventsResponse, CalendarListItem } from "@/hooks/api/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CalendarOfflineEditIntent } from "./calendar-offline-intent";

const eventsContract = lazyContract(() => import("@/hooks/api/calendar-schema").then((module) => module.calendarEventsResponseContract));
const detailContract = lazyContract(() => import("@/hooks/api/calendar-schema").then((module) => module.calendarEventDetailContract));
const availabilityContract = z.object({
  evaluatedAt: z.string(),
  slots: z.array(z.object({ state: z.enum(["free", "busy", "tentative", "unknown"]), coverageState: z.enum(["complete", "partial", "failed", "disconnected", "stale", "permission_limited"]), explanation: z.string() })),
});

export function CalendarOfflineEditReview({ intent, onDiscard, onContinue }: {
  intent: CalendarOfflineEditIntent;
  onDiscard: () => void;
  onContinue: (event: CalendarListItem, rrule: string | null) => void;
}) {
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    const update = () => setNowMs(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const { data: session, status } = useSession();
  const canRead = useCan("calendar:read");
  const canWrite = useCan("calendar:write");
  const policy = useCalendarOfflinePolicy();
  const identity = session?.orgId && session.user?.id ? `${session.orgId}:${session.user.id}` : "";
  const sameIdentity = status === "authenticated" && identity === intent.identity;
  const policyCurrent = policy.isFetchedAfterMount && !policy.isFetching && !policy.isError && policy.dataUpdatedAt >= intent.createdAt && policy.data?.enabled === true && policy.data.version === intent.policyVersion;
  const start = new Date(intent.start);
  const end = new Date(intent.end);
  const originalStart = new Date(intent.originalStart);
  const originalEnd = new Date(intent.originalEnd);
  const eventId = Number(intent.sourceRecordId);
  const valid = nowMs > 0 && Number.isSafeInteger(eventId) && eventId > 0 && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start.getTime() > nowMs && end > start && end.getTime() - start.getTime() <= 31 * 86_400_000 && Number.isFinite(originalStart.getTime()) && Number.isFinite(originalEnd.getTime()) && originalEnd > originalStart;
  const review = useQuery({
    queryKey: ["calendar", "offline-edit-review", identity, intent.occurrenceId, intent.expectedSourceVersion, intent.start, intent.end, intent.createdAt],
    queryFn: async ({ signal }) => {
      const [events, detail, availability] = await Promise.all([
        apiClient.get<CalendarEventsResponse>("/calendar/events", { start: new Date(originalStart.getTime() - 60_000).toISOString(), end: new Date(originalEnd.getTime() + 60_000).toISOString() }, signal, eventsContract),
        apiClient.get<CalendarEventDetail>(`/calendar/events/${eventId}`, undefined, signal, detailContract),
        apiClient.post<z.infer<typeof availabilityContract>>("/calendar/availability/evaluate", { slots: [{ start: intent.start, end: intent.end }], participants: [{ userId: session?.user?.id ?? "", requirement: "required" }], bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }, { signal }, availabilityContract),
      ]);
      const event = events.events.find((item) => item.source === "event" && item.sourceRecordId === intent.sourceRecordId && item.occurrenceId === intent.occurrenceId) ?? null;
      return { event, detail, availability, coverage: events.coverageState };
    },
    enabled: sameIdentity && canRead && canWrite && policyCurrent && valid,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
  const event = review.data?.event;
  const detail = review.data?.detail;
  const slot = review.data?.availability.slots[0];
  const sourceCurrent = Boolean(event?.actions.edit && detail?.canManage && event.sourceVersion === intent.expectedSourceVersion && String(detail.localVersion) === intent.expectedSourceVersion &&
    new Date(event.start).getTime() === originalStart.getTime() && new Date(event.end).getTime() === originalEnd.getTime() && review.data?.coverage === "complete");
  const evaluationAge = review.data ? nowMs - new Date(review.data.availability.evaluatedAt).getTime() : NaN;
  const evaluationCurrent = review.isFetchedAfterMount && review.dataUpdatedAt >= intent.createdAt &&
    Number.isFinite(evaluationAge) && evaluationAge >= 0 && evaluationAge < 60_000;
  const safe = sameIdentity && canRead && canWrite && policyCurrent && valid && sourceCurrent && slot?.state === "free" && slot.coverageState === "complete" &&
    !review.isFetching && !review.isError && evaluationCurrent;
  return <Dialog open onOpenChange={(open) => { if (!open) onDiscard(); }}>
    <DialogContent><DialogHeader><DialogTitle>Review offline event change</DialogTitle><DialogDescription>No event was changed while offline. The original occurrence, permission, version, policy, and proposed time must all be current before the edit form opens.</DialogDescription></DialogHeader>
      <div className="space-y-3 text-sm">
        <p>Proposed time: {start.toLocaleString()} – {end.toLocaleString()}</p>
        {!sameIdentity ? <p className="text-destructive">The account or organization changed. Discard this draft.</p> : null}
        {sameIdentity && (!canRead || !canWrite) ? <p className="text-destructive">Calendar access changed. Discard this draft.</p> : null}
        {policy.isLoading || policy.isFetching ? <p className="text-muted-foreground">Rechecking offline policy</p> : null}
        {policy.isError ? <p className="text-destructive">{getErrorMessage(policy.error)}</p> : null}
        {policy.data && !policyCurrent ? <p className="text-destructive">The offline policy changed. Discard this draft.</p> : null}
        {!valid ? <p className="text-destructive">The proposed or original time is invalid.</p> : null}
        {review.isLoading ? <p className="text-muted-foreground">Rechecking the occurrence and live availability</p> : null}
        {review.isError ? <p className="text-destructive">{getErrorMessage(review.error)}</p> : null}
        {review.data && !sourceCurrent ? <p className="text-destructive">This event or occurrence changed, or its coverage is incomplete. Discard and refresh the Calendar.</p> : null}
        {slot && (slot.state !== "free" || slot.coverageState !== "complete") ? <p className="text-destructive">The proposed time needs review: {slot.explanation}</p> : null}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" onClick={onDiscard}>Discard</Button>{policy.isError ? <Button variant="outline" onClick={() => { void policy.refetch(); }}>Retry policy</Button> : null}{review.isError ? <Button variant="outline" onClick={() => { void review.refetch(); }}>Retry checks</Button> : null}{sameIdentity && canRead && canWrite && policyCurrent && valid && review.data && !evaluationCurrent && !review.isFetching && !review.isError ? <Button variant="outline" onClick={() => { void review.refetch(); }}>Recheck current state</Button> : null}<Button disabled={!safe || !event || !detail} onClick={() => { if (event && detail) onContinue({ ...event, start: intent.start, end: intent.end }, detail.rrule); }}>Continue to edit form</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}
