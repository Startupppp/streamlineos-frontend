"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useCalendarOfflinePolicy } from "@/hooks/api/calendar-offline-policy";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CalendarOfflineIntent } from "./calendar-offline-intent";

const availabilityContract = z.object({
  evaluatedAt: z.string(),
  slots: z.array(z.object({
    state: z.enum(["free", "busy", "tentative", "unknown"]),
    coverageState: z.enum(["complete", "partial", "failed", "disconnected", "stale", "permission_limited"]),
    explanation: z.string(),
  })),
});

export function CalendarOfflineIntentReview({ intent, onDiscard, onContinue }: {
  intent: CalendarOfflineIntent;
  onDiscard: () => void;
  onContinue: (slot: { start: Date; end: Date }) => void;
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
  const policyCurrent = policy.isFetchedAfterMount && !policy.isFetching && !policy.isError && policy.dataUpdatedAt >= intent.createdAt &&
    policy.data?.enabled === true && policy.data.version === intent.policyVersion;
  const start = new Date(intent.start);
  const end = new Date(intent.end);
  const valid = nowMs > 0 && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start < end && start.getTime() > nowMs && end.getTime() - start.getTime() <= 31 * 86_400_000;
  const availability = useQuery({
    queryKey: ["calendar", "offline-intent-review", intent.identity, intent.start, intent.end, intent.policyVersion, intent.createdAt],
    queryFn: ({ signal }) => apiClient.post<z.infer<typeof availabilityContract>>(
      "/calendar/availability/evaluate",
      { slots: [{ start: intent.start, end: intent.end }], participants: [{ userId: session?.user?.id ?? "", requirement: "required" }], bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
      { signal }, availabilityContract,
    ),
    enabled: sameIdentity && canRead && canWrite && policyCurrent && valid,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
  const slot = availability.data?.slots[0];
  const evaluationAge = availability.data ? nowMs - new Date(availability.data.evaluatedAt).getTime() : NaN;
  const safe = sameIdentity && canRead && canWrite && policyCurrent && valid && slot?.state === "free" && slot.coverageState === "complete" &&
    availability.isFetchedAfterMount && !availability.isFetching && !availability.isError && availability.dataUpdatedAt >= intent.createdAt &&
    Number.isFinite(evaluationAge) && evaluationAge >= 0 && evaluationAge < 60_000;
  return <Dialog open onOpenChange={(open) => { if (!open) onDiscard(); }}>
    <DialogContent><DialogHeader><DialogTitle>Review offline time draft</DialogTitle><DialogDescription>This draft was not booked while offline. Current access, policy, and availability must be checked before you continue.</DialogDescription></DialogHeader>
      <div className="space-y-3 text-sm">
        <p>{start.toLocaleString()} – {end.toLocaleString()}</p>
        {!sameIdentity ? <p className="text-destructive">The organization or account changed. Discard this draft.</p> : null}
        {sameIdentity && (!canRead || !canWrite) ? <p className="text-destructive">Calendar access changed. Discard this draft.</p> : null}
        {sameIdentity && (policy.isLoading || policy.isFetching) ? <p className="text-muted-foreground">Rechecking current offline policy</p> : null}
        {policy.isError ? <p className="text-destructive">{getErrorMessage(policy.error)}</p> : null}
        {sameIdentity && policy.data && !policyCurrent ? <p className="text-destructive">The offline policy changed. Discard this draft and start again.</p> : null}
        {!valid ? <p className="text-destructive">This time window is expired or invalid.</p> : null}
        {availability.isLoading ? <p className="text-muted-foreground">Checking live availability</p> : null}
        {availability.isError ? <p className="text-destructive">{getErrorMessage(availability.error)}</p> : null}
        {slot ? <p>{slot.state === "free" && slot.coverageState === "complete" ? "Time is currently available" : `Time needs review: ${slot.explanation}`}</p> : null}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onDiscard}>Discard</Button>{policy.isError ? <Button variant="outline" onClick={() => { void policy.refetch(); }}>Retry policy</Button> : null}{availability.isError ? <Button variant="outline" onClick={() => { void availability.refetch(); }}>Retry availability</Button> : null}<Button disabled={!safe} onClick={() => onContinue({ start, end })}>Continue to event form</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}
