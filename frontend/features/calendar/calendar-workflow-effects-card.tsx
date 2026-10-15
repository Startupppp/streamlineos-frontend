"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCalendarWorkflowEffects, useReplayCalendarWorkflowEffect } from "@/hooks/api/calendar-workflows";
import type { CalendarWorkflowEffect } from "@/hooks/api/calendar-workflows-schema";

const failedStatuses = new Set(["FAILED", "DEAD_LETTERED"]);

export function calendarWorkflowEffectCanReplay(status: CalendarWorkflowEffect["status"]): boolean {
  return failedStatuses.has(status);
}

function statusVariant(status: CalendarWorkflowEffect["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "SUCCEEDED") return "default";
  if (status === "FAILED" || status === "DEAD_LETTERED") return "destructive";
  if (status === "PENDING" || status === "IN_FLIGHT") return "secondary";
  return "outline";
}

export function CalendarWorkflowEffectsCard() {
  const [status, setStatus] = useState<CalendarWorkflowEffect["status"] | undefined>();
  const effectsQuery = useCalendarWorkflowEffects(status);
  const effects = effectsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = effectsQuery;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const replay = useReplayCalendarWorkflowEffect();

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void fetchNextPage();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function changeStatus(value: string) {
    if (value === "FAILED" || value === "DEAD_LETTERED") setStatus(value);
    else setStatus(undefined);
  }

  async function replayEffect(effect: CalendarWorkflowEffect) {
    try {
      await replay.mutateAsync({ id: effect.id, expectedVersion: effect.version });
      toast.success("Effect queued for replay");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery ledger</CardTitle>
        <CardDescription>Effects, retries, suppressions, and dead letters. Replay uses the current policy and consent state.</CardDescription>
        <Select value={status ?? "all"} onValueChange={changeStatus}>
          <SelectTrigger aria-label="Filter workflow effects by status" className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All effects</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="DEAD_LETTERED">Dead letters</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {effectsQuery.isLoading ? <Skeleton className="h-36 w-full" /> : effectsQuery.isError && effects.length === 0 ? (
          <ErrorState title="Workflow effects could not be loaded" onRetry={() => void effectsQuery.refetch()} />
        ) : effects.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No workflow effects have been recorded.</div>
        ) : (
          <div className="divide-y rounded-lg border">
            {effects.map((effect) => <CalendarWorkflowEffectRow key={effect.id} effect={effect} isReplaying={replay.isPending && replay.variables?.id === effect.id} onReplay={replayEffect} />)}
          </div>
        )}
        {effectsQuery.isFetchNextPageError ? <ErrorState title="Older workflow effects could not be loaded" onRetry={() => void effectsQuery.fetchNextPage()} /> : null}
        <div ref={sentinelRef} aria-hidden="true" />
        {effectsQuery.isFetchingNextPage ? <Skeleton className="mt-3 h-14 w-full" /> : null}
      </CardContent>
    </Card>
  );
}

function CalendarWorkflowEffectRow({ effect, isReplaying, onReplay }: {
  effect: CalendarWorkflowEffect;
  isReplaying: boolean;
  onReplay: (effect: CalendarWorkflowEffect) => Promise<void>;
}) {
  function handleReplay() {
    void onReplay(effect);
  }

  return (
    <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><Badge variant={statusVariant(effect.status)}>{effect.status.replace("_", " ")}</Badge><span className="text-sm font-medium">{effect.action.title}</span></div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{effect.triggerEvent} · {effect.aggregateType}/{effect.aggregateId} · version {effect.aggregateVersion}</p>
        {effect.lastError ? <p className="mt-1 text-xs text-destructive">{effect.lastError}</p> : null}
        {effect.suppressionReason ? <p className="mt-1 text-xs text-muted-foreground">Suppressed: {effect.suppressionReason.replaceAll("_", " ")}</p> : null}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Attempts {effect.attemptCount}/{effect.maxAttempts}</span>
        <span>Replays {effect.replayCount}</span>
        {calendarWorkflowEffectCanReplay(effect.status) ? <LoadingButton variant="outline" size="sm" isPending={isReplaying} onClick={handleReplay}><RotateCcw className="size-3.5" />Replay</LoadingButton> : null}
      </div>
    </div>
  );
}
