"use client";

import { Undo2, VolumeX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { useLiveClassStops, useReleaseClassStop } from "@/hooks/api/crm/autonomy";
import type { LiveClassStop } from "@/types/crm/autonomy";

/**
 * Reads the stored class as a phrase rather than a token.
 *
 * Unknown values pass through as-is: the backend owns this vocabulary and a
 * class added there should show up here as itself, not as "Unknown".
 */
const CLASS_LABEL: Record<string, string> = {
  nudge: "Chasers",
  renewal: "Renewal conversations",
  quote_followup: "Quote follow-ups",
  check_in: "Check-ins",
};

function classLabel(outboundClass: string): string {
  return CLASS_LABEL[outboundClass] ?? outboundClass.replace(/_/g, " ");
}

function ClassStopRow({
  stop,
  canRelease,
  onRelease,
  isReleasing,
}: {
  stop: LiveClassStop;
  canRelease: boolean;
  onRelease: (outboundClassStopId: string) => void;
  isReleasing: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-gap-field border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{classLabel(stop.outboundClass)}</p>
        <p className="truncate text-micro text-muted-foreground">
          Stopped for this contact on{" "}
          {new Date(stop.stoppedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {stop.reason ? ` · ${stop.reason}` : ""}
        </p>
      </div>

      {canRelease ? (
        <LoadingButton
          variant="outline"
          size="sm"
          isPending={isReleasing}
          onClick={() => onRelease(stop.outboundClassStopId)}
        >
          <Undo2 className="size-4 sm:mr-1.5" />
          <span className="sr-only sm:not-sr-only">Allow again</span>
        </LoadingButton>
      ) : null}
    </div>
  );
}

/**
 * CRM-P0-12. The people this organisation has stopped writing to, and the only
 * way back.
 *
 * Stopping a message stops that whole class of message for that party, with no
 * expiry — `released_at` is cleared only by a person. The API for doing that
 * has existed since the stop did; no screen ever called it, so in practice the
 * stop was a one-way door and the only exit was a database write.
 *
 * The class matters and is shown: somebody who does not want chasing may still
 * want the renewal conversation, and releasing is per class, not per person.
 *
 * Hides itself when nothing is stopped, like the pending-sends panel above it —
 * a permanently empty box teaches people to stop looking.
 */
export function ClassStopsPanel() {
  const canRelease = useCan("crm:autonomy:manage");
  const { data: stops } = useLiveClassStops();
  const release = useReleaseClassStop();

  if (!stops || stops.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-gap-inline">
          <VolumeX className="size-4" />
          Stopped conversations
        </CardTitle>
        <CardDescription>
          Somebody stopped these, so the system will not send them again until a person
          says it may.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {release.isError ? (
          <p role="alert" className="mb-2 text-label text-status-danger-ink">
            {release.error instanceof Error
              ? release.error.message
              : "That could not be released."}
          </p>
        ) : null}

        {stops.map((stop) => (
          <ClassStopRow
            key={stop.outboundClassStopId}
            stop={stop}
            canRelease={canRelease}
            onRelease={(outboundClassStopId) => release.mutate({ outboundClassStopId })}
            isReleasing={
              release.isPending &&
              release.variables?.outboundClassStopId === stop.outboundClassStopId
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}
