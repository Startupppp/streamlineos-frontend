"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useEventSyncStatus, useRetryEventSync } from "@/hooks/api/calendar";

interface EventSyncStatusProps {
  eventId: number | null;
}

export function EventSyncStatus({ eventId }: EventSyncStatusProps) {
  const { data } = useEventSyncStatus(eventId);
  const retry = useRetryEventSync();
  const tone = statusToneClasses("danger");

  if (!data || data.status === "synced" || data.status === "not_synced") return null;

  if (data.status === "pending" || data.status === "in_flight") {
    return <p className="text-xs text-muted-foreground">Syncing to your calendar…</p>;
  }

  const handleRetry = () => {
    if (!eventId) return;
    retry.mutate(
      { eventId },
      {
        onSuccess: () => toast.success("Sync re-queued"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const attemptLabel = data.attemptCount === 1 ? "1 attempt" : `${data.attemptCount} attempts`;

  return (
    <div className={cn("rounded-md border p-3 text-sm space-y-2", tone.surface, tone.rule)}>
      <p className={tone.ink}>
        Sync to your external calendar failed after {attemptLabel}.
      </p>
      {data.lastError ? (
        <p className="text-xs text-muted-foreground line-clamp-2" title={data.lastError}>
          {data.lastError}
        </p>
      ) : null}
      {data.retryable ? (
        <LoadingButton
          size="sm"
          variant="outline"
          isPending={retry.isPending}
          onClick={handleRetry}
        >
          Retry sync
        </LoadingButton>
      ) : null}
    </div>
  );
}
