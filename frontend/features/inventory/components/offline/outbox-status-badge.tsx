"use client";

import * as React from "react";
import { CircleCheck, Clock, TriangleAlert, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useInventoryOutbox } from "@/hooks/api/inventory/offline-outbox";

/**
 * B8 — the queue, in one chip.
 *
 * Four states and they are ranked, because an operator glancing at a header
 * needs the worst news first: a conflict is waiting on them, work is queued,
 * the radio is down, or everything landed. Showing "3 queued" while one of the
 * three is stuck in conflict would let a device sit with unresolvable work all
 * shift and look busy rather than broken.
 *
 * Rendered as text, not just a colour: on a warehouse phone in daylight the
 * tint is the first thing to go.
 */
export function OutboxStatusBadge({ className }: { className?: string }) {
  const { counts, isOnline, isAvailable } = useInventoryOutbox();

  if (!isAvailable) return null;

  const waiting = counts.queued + counts.inFlight;

  if (counts.conflict > 0) {
    return (
      <Badge
        variant="outline"
        className={cn(statusToneClasses("danger").surface, statusToneClasses("danger").ink, statusToneClasses("danger").rule, className)}
      >
        <TriangleAlert aria-hidden />
        {counts.conflict} needs attention
      </Badge>
    );
  }

  if (waiting > 0) {
    return (
      <Badge
        variant="outline"
        className={cn(statusToneClasses("warning").surface, statusToneClasses("warning").ink, statusToneClasses("warning").rule, className)}
      >
        <Clock aria-hidden />
        <span className="tabular-nums">{waiting}</span> queued
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <Badge
        variant="outline"
        className={cn(statusToneClasses("neutral").surface, statusToneClasses("neutral").ink, statusToneClasses("neutral").rule, className)}
      >
        <WifiOff aria-hidden />
        Offline
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(statusToneClasses("success").surface, statusToneClasses("success").ink, statusToneClasses("success").rule, className)}
    >
      <CircleCheck aria-hidden />
      Synced
    </Badge>
  );
}
