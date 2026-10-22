"use client";

import { useCallback, useMemo } from "react";
import { Boxes } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { RfShell } from "@/features/inventory/components/rf/rf-shell";
import { RfQueueList } from "@/features/inventory/components/rf/rf-queue-list";
import { useCan } from "@/hooks/api/access";
import { useRfQueue } from "@/hooks/api/inventory/rf-queue";

const PUTAWAY_READ = "inventory:stock:read";

const RF_QUEUE_HREF = "/inventory/rf";

export default function RfPutawayQueuePage() {
  const canPutaway = useCan(PUTAWAY_READ);
  const { tasks, isLoading, isError, refetch } = useRfQueue();

  const handleRetry = useCallback(() => refetch(), [refetch]);
  const putaways = useMemo(
    () => tasks.filter((task) => task.kind === "PUTAWAY"),
    [tasks],
  );

  if (!canPutaway) {
    return (
      <RfShell title="Put away" backHref={RF_QUEUE_HREF}>
        <NoPermissionState permission={PUTAWAY_READ} className="flex-1" />
      </RfShell>
    );
  }

  if (isLoading) {
    return (
      <RfShell title="Put away" backHref={RF_QUEUE_HREF}>
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
      <RfShell title="Put away" backHref={RF_QUEUE_HREF}>
        <ErrorState
          title="Could not load your putaway tasks"
          description="The queue could not be fetched. Anything you have already confirmed is still safe on the device."
          onRetry={handleRetry}
          className="flex-1"
        />
      </RfShell>
    );
  }

  return (
    <RfShell
      title="Put away"
      subtitle={`${putaways.length} waiting`}
      backHref={RF_QUEUE_HREF}
    >
      {putaways.length > 0 ? (
        <RfQueueList tasks={putaways} icon={Boxes} />
      ) : (
        <InventoryEmptyState
          illustration={<EmptyWarehouseIllustration />}
          title="No putaway tasks assigned to you"
          description="Receive a delivery on the dock, or go back to your full task list."
        />
      )}
    </RfShell>
  );
}
