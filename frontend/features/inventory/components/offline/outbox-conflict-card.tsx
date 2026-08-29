"use client";

import * as React from "react";
import { SendIcon, TrashIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useStockLevels } from "@/hooks/api/inventory/stock-levels";
import { useResolveOutboxConflict } from "@/hooks/api/inventory/offline-outbox";
import type { OutboxConflictKind, OutboxEntry } from "@/lib/offline/outbox-types";
import { outboxEntryDescription, outboxKindLabel, outboxQuantityText } from "./outbox-entry-summary";

/**
 * B8 — the three answers, kept distinct.
 *
 * A queue that reports every refusal as "sync failed" teaches an operator to
 * press retry until it stops complaining, which is how a stale pick gets forced
 * through at the end of a shift. Each kind gets its own heading, its own
 * explanation of what the server actually knows, and its own default action:
 *
 *   `insufficient` — the stock is not there. The current available figure is
 *     fetched and shown, because "you cannot take 12" is not actionable and
 *     "there are 4 on the shelf" is.
 *   `stale`        — the document moved on. Discard is offered first; sending
 *     it again will fail the same way until somebody looks at the record.
 *   `unauthorized` — the session expired. Sign in, then send again. Never
 *     discarded on the operator's behalf, and never retried on a timer: a 401
 *     in a loop signs the device out repeatedly and the queue never clears.
 *   `rejected`     — refused for a reason we cannot categorise, shown verbatim
 *     rather than dressed up as one of the above.
 */
interface ConflictCopy {
  title: string;
  tone: "danger" | "warning";
  guidance: string;
  /** Which action reads as the sensible one for this kind. */
  primary: "retry" | "discard";
}

const CONFLICT_COPY: Readonly<Record<OutboxConflictKind, ConflictCopy>> = {
  insufficient: {
    title: "Not enough stock",
    tone: "danger",
    guidance:
      "The shelf does not hold what this operation asks for. Re-count and queue the right quantity, or send this again if you believe the figure below is wrong.",
    primary: "discard",
  },
  stale: {
    title: "The record moved on",
    tone: "warning",
    guidance:
      "Somebody changed this document while the device was offline. Sending it again will be refused the same way until the record is looked at.",
    primary: "discard",
  },
  unauthorized: {
    title: "Session expired",
    tone: "warning",
    guidance:
      "Nothing was lost. Sign in again, then send this — it will replay under the same key, so anything that already landed stays as it is.",
    primary: "retry",
  },
  rejected: {
    title: "Refused by the server",
    tone: "danger",
    guidance:
      "This operation could not be applied. The reason is shown exactly as the server gave it.",
    primary: "retry",
  },
};

/**
 * What is actually on the shelf now.
 *
 * Only queried for the one conflict kind where it is the answer, and only when
 * the operation names a place to look — a fetch on every conflict card would
 * put N requests behind a queue that has just come back from an outage.
 */
function CurrentAvailability({ entry }: { entry: OutboxEntry }) {
  const operation = entry.operation;
  const canRead = useCan("inventory:stock:read");
  const variantId =
    operation.type === "stock.adjust" ? operation.productVariantId : undefined;
  const locationId =
    operation.type === "stock.adjust" ? operation.locationId : undefined;

  const { data, isLoading } = useStockLevels(
    variantId ? { variantId, locationId, limit: 1 } : undefined,
  );

  if (!variantId || !canRead) return null;
  if (isLoading) return <Skeleton className="h-4 w-32" />;

  const row = data?.items[0];
  if (!row) return null;

  return (
    <p className="text-xs text-muted-foreground">
      On the shelf now:{" "}
      <span className="font-mono tabular-nums text-foreground">{row.available}</span>{" "}
      available of{" "}
      <span className="font-mono tabular-nums text-foreground">{row.onHand}</span> on hand
      {row.locationCode ? ` in ${row.locationCode}` : ""}.
    </p>
  );
}

export function OutboxConflictCard({ entry }: { entry: OutboxEntry }) {
  const resolve = useResolveOutboxConflict();
  const conflict = entry.conflict;
  const copy = CONFLICT_COPY[conflict?.kind ?? "rejected"];
  const tone = statusToneClasses(copy.tone);
  const quantity = outboxQuantityText(entry.operation);

  function handleRetry() {
    resolve.mutate(
      { action: "retry", clientOperationIds: [entry.clientOperationId] },
      {
        onSuccess: () => {
          toast.success("Queued again. It will replay under the same key.");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function handleDiscard() {
    resolve.mutate(
      { action: "discard", clientOperationIds: [entry.clientOperationId] },
      {
        onSuccess: () => {
          toast.success("Discarded. Nothing was sent to the server.");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <div className={cn(CONTENT_PANEL_SOLID, "flex flex-col gap-3 p-3")}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{copy.title}</span>
            <Badge
              variant="outline"
              className={cn(tone.surface, tone.ink, tone.rule)}
            >
              {outboxKindLabel(entry.type)}
            </Badge>
          </div>
          <TruncatedText
            text={outboxEntryDescription(entry)}
            className="mt-1 block text-xs text-muted-foreground"
          />
        </div>
        {quantity ? (
          <span className="shrink-0 font-mono text-sm tabular-nums">{quantity}</span>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">{copy.guidance}</p>

      <p className={cn("rounded-md px-2 py-1.5 text-xs", tone.surface, tone.ink)}>
        {conflict?.reason ?? "The server refused this operation."}
      </p>

      {conflict?.kind === "insufficient" ? <CurrentAvailability entry={entry} /> : null}

      <div className="grid grid-cols-2 gap-2">
        <AnimatedIconButton
          icon={TrashIcon}
          iconSize={16}
          iconClassName="mr-1.5"
          variant={copy.primary === "discard" ? "default" : "outline"}
          size="sm"
          onClick={handleDiscard}
          disabled={resolve.isPending}
        >
          Discard
        </AnimatedIconButton>
        <AnimatedIconButton
          icon={SendIcon}
          iconSize={16}
          iconClassName="mr-1.5"
          variant={copy.primary === "retry" ? "default" : "outline"}
          size="sm"
          onClick={handleRetry}
          disabled={resolve.isPending}
        >
          Send again
        </AnimatedIconButton>
      </div>
    </div>
  );
}
