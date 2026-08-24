"use client";

import { useEffect, useState } from "react";
import { Send, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { useCancelHold, useLiveHolds } from "@/hooks/api/crm/autonomy";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { LiveHold } from "@/types/crm/autonomy";

/**
 * Counts down from the server's number rather than from the clock.
 *
 * A browser whose clock is wrong would otherwise show a window that has closed
 * as still open, or the reverse. The send is decided by the workflow; this is
 * only a readout, and it stops at zero rather than going negative.
 */
function useCountdown(startingFrom: number): number {
  const [remaining, setRemaining] = useState(startingFrom);

  useEffect(() => {
    setRemaining(startingFrom);
    if (startingFrom <= 0) return;

    const timer = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [startingFrom]);

  return remaining;
}

function HoldRow({
  hold,
  canCancel,
  onCancel,
  isCancelling,
}: {
  hold: LiveHold;
  canCancel: boolean;
  onCancel: (holdId: string) => void;
  isCancelling: boolean;
}) {
  const remaining = useCountdown(hold.secondsRemaining);
  const urgent = remaining <= 15;

  return (
    <div className="flex flex-wrap items-center justify-between gap-gap-field border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {hold.quoteSubject ?? "A quote"}
        </p>
        {hold.summary ? (
          <p className="truncate text-micro text-muted-foreground">{hold.summary}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-gap-toolbar">
        <span
          className={cn(
            "tabular-nums text-sm font-medium",
            urgent ? statusToneClasses("danger").ink : statusToneClasses("warning").ink,
          )}
          // Announced only as it gets urgent — a live region ticking every
          // second would make a screen reader unusable.
          aria-live={urgent ? "polite" : "off"}
        >
          {remaining > 0 ? `${remaining}s` : "sending…"}
        </span>

        {canCancel && remaining > 0 ? (
          <LoadingButton
            variant="outline"
            size="sm"
            isPending={isCancelling}
            onClick={() => onCancel(hold.autonomyHoldId)}
          >
            <X className="size-4 sm:mr-1.5" />
            <span className="sr-only sm:not-sr-only">Stop it</span>
          </LoadingButton>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The window in which a send can still be stopped.
 *
 * Nobody approves anything here — the only control is cancel. The panel hides
 * itself when nothing is waiting, because a permanently empty box teaches
 * people to stop looking at the place the warnings appear.
 */
export function PendingSendsPanel() {
  const canCancel = useCan("crm:autonomy:reverse");
  const { data: holds } = useLiveHolds();
  const cancel = useCancelHold();

  if (!holds || holds.length === 0) return null;

  return (
    <Card className={cn("border-status-warning-rule")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-gap-inline">
          <Send className="size-4" />
          About to send
        </CardTitle>
        <CardDescription>
          These leave on their own unless somebody stops them.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {cancel.isError ? (
          <p role="alert" className="mb-2 text-label text-status-danger-ink">
            {cancel.error instanceof Error ? cancel.error.message : "That could not be stopped."}
          </p>
        ) : null}

        {holds.map((hold) => (
          <HoldRow
            key={hold.autonomyHoldId}
            hold={hold}
            canCancel={canCancel}
            onCancel={(holdId) => cancel.mutate({ holdId })}
            isCancelling={cancel.isPending && cancel.variables?.holdId === hold.autonomyHoldId}
          />
        ))}
      </CardContent>
    </Card>
  );
}
