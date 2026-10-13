"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReplayCalendarWorkflowEffect } from "@/hooks/api/calendar-workflows";
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

export function CalendarWorkflowEffectsCard({ effects }: { effects: CalendarWorkflowEffect[] }) {
  const replay = useReplayCalendarWorkflowEffect();

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
      <CardHeader><CardTitle>Delivery ledger</CardTitle><CardDescription>Recent effects, retries, suppressions, and dead letters. Replay uses the current policy and consent state.</CardDescription></CardHeader>
      <CardContent>
        {effects.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No workflow effects have been recorded.</div>
        ) : (
          <div className="divide-y rounded-lg border">
            {effects.map((effect) => (
              <div key={effect.id} className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><Badge variant={statusVariant(effect.status)}>{effect.status.replace("_", " ")}</Badge><span className="text-sm font-medium">{effect.action.title}</span></div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{effect.triggerEvent} · {effect.aggregateType}/{effect.aggregateId} · version {effect.aggregateVersion}</p>
                  {effect.lastError ? <p className="mt-1 text-xs text-destructive">{effect.lastError}</p> : null}
                  {effect.suppressionReason ? <p className="mt-1 text-xs text-muted-foreground">Suppressed: {effect.suppressionReason.replaceAll("_", " ")}</p> : null}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Attempts {effect.attemptCount}/{effect.maxAttempts}</span>
                  <span>Replays {effect.replayCount}</span>
                  {calendarWorkflowEffectCanReplay(effect.status) ? <LoadingButton variant="outline" size="sm" isPending={replay.isPending && replay.variables?.id === effect.id} onClick={() => void replayEffect(effect)}><RotateCcw className="size-3.5" />Replay</LoadingButton> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
