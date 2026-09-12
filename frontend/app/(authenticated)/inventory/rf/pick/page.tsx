"use client";

import { useCallback, useMemo } from "react";
import { PackageCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { RfShell } from "@/features/inventory/components/rf/rf-shell";
import { RfQueueList } from "@/features/inventory/components/rf/rf-queue-list";
import { useCan } from "@/hooks/api/access";
import { useRfQueue } from "@/hooks/api/inventory/rf-queue";

/** The key `usePickWaves` is gated on, so the queue and its rows agree. */
const PICK_READ = "inventory:sales-orders:read";

const RF_QUEUE_HREF = "/inventory/rf";

/**
 * T09 — `/inventory/rf/pick` used to 404.
 *
 * Only `/inventory/rf/pick/[pickListId]` was routable, so the segment above it
 * answered nothing. That is not a hypothetical URL: a scanner that mis-reads the
 * trailing digits of a wave barcode, a deep link truncated in a chat message, or
 * an operator backing one level up out of a task all land here — and landing on
 * a 404 while holding a scanner in one hand is the worst possible moment for it.
 *
 * So the segment answers with the thing the operator wanted: their picks. It is
 * the RF queue filtered to one kind, not a second queue — the rows, the hrefs
 * and the "assigned to me" definition all come from `useRfQueue`, the same hook
 * `/inventory/rf` reads, so the two screens can never disagree about what is
 * assigned. `RfShell` supplies the back affordance to the full queue, which is
 * also the "nothing selected" way out.
 */
export default function RfPickQueuePage() {
  const canPick = useCan(PICK_READ);
  const { tasks, isLoading, isError, refetch } = useRfQueue();

  const handleRetry = useCallback(() => refetch(), [refetch]);
  const picks = useMemo(() => tasks.filter((task) => task.kind === "PICK"), [tasks]);

  if (!canPick) {
    return (
      <RfShell title="Picks" backHref={RF_QUEUE_HREF}>
        <NoPermissionState permission={PICK_READ} className="flex-1" />
      </RfShell>
    );
  }

  if (isLoading) {
    return (
      <RfShell title="Picks" backHref={RF_QUEUE_HREF}>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </RfShell>
    );
  }

  if (isError) {
    return (
      <RfShell title="Picks" backHref={RF_QUEUE_HREF}>
        <ErrorState
          title="Could not load your picks"
          description="The queue could not be fetched. Anything you have already confirmed is still safe on the device."
          onRetry={handleRetry}
          className="flex-1"
        />
      </RfShell>
    );
  }

  return (
    <RfShell title="Picks" subtitle={`${picks.length} waiting`} backHref={RF_QUEUE_HREF}>
      {picks.length > 0 ? (
        <RfQueueList tasks={picks} icon={PackageCheck} />
      ) : (
        <InventoryEmptyState
          illustration={<EmptyWarehouseIllustration />}
          title="No picks assigned to you"
          description="Claim a wave from the picking workbench, or go back to your full task list."
        />
      )}
    </RfShell>
  );
}
