"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { RfShell } from "@/features/inventory/components/rf/rf-shell";
import { RfStep } from "@/features/inventory/components/rf/rf-step";
import { usePutawayTask, useCompletePutaway } from "@/hooks/api/inventory/putaway";
import { useCaptureScan } from "@/hooks/api/inventory/scan";
import { randomId } from "@/lib/random-id";

const PUTAWAY_READ = "inventory:stock:read";
const PUTAWAY_WRITE = "inventory:stock:transfer";

/**
 * NEO-5 - putting a receipt away on a handheld.
 *
 * The destination comes from the task's own suggestion where it has one, which
 * is what makes this a single-decision screen: the operator confirms a bin
 * rather than choosing one from a list they cannot read at arm's length. Where
 * there is no suggestion the bin is typed, because inventing one would be the
 * system deciding where somebody's stock lives.
 */
function RfPutawayContent() {
  const params = useParams<{ taskId: string }>();
  const router = useRouter();
  const taskId = Number(params.taskId);

  const canRead = useCan(PUTAWAY_READ);
  const canMove = useCan(PUTAWAY_WRITE);
  const { data, isLoading, isError, refetch } = usePutawayTask(taskId);
  const complete = useCompletePutaway();
  const capture = useCaptureScan();

  const [doneLineIds, setDoneLineIds] = useState<number[]>([]);

  const openLines = useMemo(
    () =>
      (data?.lines ?? []).filter(
        (line) => Number(line.remaining) > 0 && !doneLineIds.includes(line.id),
      ),
    [data?.lines, doneLineIds],
  );
  const line = openLines[0];
  const destination = line?.to_location_id ?? line?.suggestions?.[0]?.locationId ?? null;
  const destinationCode = line?.to_location_code ?? line?.suggestions?.[0]?.code ?? null;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleConfirm = useCallback(
    async ({ quantity, scannedPayload }: { quantity: string; scannedPayload: string | null }) => {
      if (!line) return;
      if (destination === null) {
        toast.error("This line has no destination bin. Set one on the desktop task first.");
        return;
      }
      try {
        if (scannedPayload) {
          await capture.mutateAsync({
            payload: scannedPayload,
            idempotencyKey: randomId(),
          });
        }
        await complete.mutateAsync({
          taskId,
          taskLineId: line.id,
          quantity,
          toLocationId: destination,
        });
        setDoneLineIds((ids) => [...ids, line.id]);
        toast.success(`${line.sku} put away`);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [capture, complete, destination, line, taskId],
  );

  const handleBackToQueue = useCallback(() => router.push("/inventory/rf"), [router]);

  if (!canRead) {
    return (
      <RfShell title="Put away" backHref="/inventory/rf">
        <NoPermissionState permission={PUTAWAY_READ} className="flex-1" />
      </RfShell>
    );
  }

  if (isLoading) {
    return (
      <RfShell title="Put away" backHref="/inventory/rf">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-14 w-full" />
      </RfShell>
    );
  }

  if (isError || !data) {
    return (
      <RfShell title="Put away" backHref="/inventory/rf">
        <ErrorState
          title="Could not load this task"
          description="The task could not be fetched. Nothing you confirmed has been lost."
          onRetry={handleRetry}
        />
      </RfShell>
    );
  }

  if (!canMove) {
    return (
      <RfShell title={data.task.taskNumber} backHref="/inventory/rf">
        <NoPermissionState permission={PUTAWAY_WRITE} className="flex-1" />
      </RfShell>
    );
  }

  if (!line) {
    return (
      <RfShell title={data.task.taskNumber} backHref="/inventory/rf">
        <InventoryEmptyState
          illustration={<EmptyWarehouseIllustration />}
          title="Task finished"
          description="Every line on this task has been put away."
          action={{ label: "Back to my tasks", onClick: handleBackToQueue }}
        />
      </RfShell>
    );
  }

  const closedCount = (data.lines ?? []).length - openLines.length;

  return (
    <RfShell
      title={data.task.taskNumber}
      subtitle={data.task.grnId ? `Receipt #${data.task.grnId}` : undefined}
      backHref="/inventory/rf"
    >
      <RfStep
        // A new line is a new component: see the note in `rf-step.tsx`.
        key={line.id}
        sku={line.sku}
        productName={line.variant_name}
        locationCode={destinationCode}
        lotNumber={line.lot_number}
        quantityAsked={line.quantity}
        quantityDone={line.quantity_moved}
        position={{ index: closedCount + 1, total: (data.lines ?? []).length }}
        isPending={complete.isPending || capture.isPending}
        onConfirm={handleConfirm}
      />
    </RfShell>
  );
}

export default function RfPutawayPage() {
  return (
    <Suspense>
      <RfPutawayContent />
    </Suspense>
  );
}
