"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSheet, ErrorState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAbandonPutawayTask,
  useCancelPutawayTask,
  useClaimPutawayTask,
  usePutawayTask,
  type PutawayTaskLine,
} from "@/hooks/api/inventory/putaway";
import {
  PUTAWAY_TASK_STATUS_BADGE,
  PUTAWAY_TASK_STATUS_LABEL,
} from "@/features/inventory/lib/inventory-status";
import { useScanTarget } from "@/features/inventory/hooks/use-scan-target";
import { scanNamesVariant } from "@/features/inventory/lib/scan-resolution";
import { ScanField } from "@/features/inventory/components/scan";
import { PutawayLineRow } from "./putaway-line-row";

interface PutawayTaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number | null;
  /** The signed-in operator, so the sheet can tell "mine" from "someone else's". */
  currentUserId: string | null;
  canPutAway: boolean;
}

/**
 * The walk itself.
 *
 * Lines are listed in the order the server sorted them — by destination bin, so
 * the list is a route through the building rather than a set of errands — and
 * the confirm controls stay disabled until this operator holds the claim. That
 * is the whole point of the claim: two operators sharing a task both carry
 * goods off the dock, and only the second one's confirm is refused, by which
 * time the pallet has already moved.
 */
export function PutawayTaskSheet({
  open,
  onOpenChange,
  taskId,
  currentUserId,
  canPutAway,
}: PutawayTaskSheetProps) {
  const [activeLineId, setActiveLineId] = useState<number | null>(null);
  const detail = usePutawayTask(taskId ?? 0, { enabled: open && !!taskId });
  const claim = useClaimPutawayTask();
  const abandon = useAbandonPutawayTask();
  const cancel = useCancelPutawayTask();

  const task = detail.data?.task;
  const lines = useMemo(() => detail.data?.lines ?? [], [detail.data]);
  const heldByMe = !!task && task.assignedTo === currentUserId;
  const heldBySomeoneElse =
    !!task && task.assignedTo !== null && task.assignedTo !== currentUserId;
  const finished = task?.status === "COMPLETED" || task?.status === "CANCELLED";
  const canConfirm = canPutAway && heldByMe && !finished;

  const openLines = useMemo(
    () => lines.filter((line) => !/^-?0(\.0+)?$/.test(line.remaining)),
    [lines],
  );

  /**
   * B2 — the pallet is scanned at the dock before anything about it moves.
   *
   * The capture is the point: a putaway the server later refuses still leaves
   * evidence the goods reached the door, which a stock movement that never
   * happened cannot provide. Matching against the task's own open lines is what
   * stops a pallet from the next bay being put away against this one.
   */
  const scan = useScanTarget<PutawayTaskLine>({
    candidates: openLines,
    documentNoun: "task",
    enabled: canConfirm,
    match: (line, resolved) => {
      if (resolved.serialId !== null && line.serial_id !== null)
        return resolved.serialId === line.serial_id;
      if (resolved.lotId !== null && line.lot_id !== null) return resolved.lotId === line.lot_id;
      return scanNamesVariant(resolved, line.product_variant_id, line.sku);
    },
    describe: (line) => ({
      key: String(line.id),
      primary: `${line.sku} · ${line.variant_name}`,
      secondary: `${line.remaining} left to put away`,
    }),
    acceptedMessage: (line) => `${line.sku} — choose the bin and confirm below.`,
    onResolved: handleScanResolved,
  });

  function handleScanResolved(line: PutawayTaskLine): void {
    setActiveLineId(line.id);
  }

  function handleRetry(): void {
    void detail.refetch();
  }

  function handleClaim(): void {
    if (!taskId) return;
    claim.mutate(taskId, {
      onSuccess: () => toast.success("Task claimed"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleAbandon(): void {
    if (!taskId) return;
    abandon.mutate(taskId, {
      onSuccess: () => toast.success("Task handed back"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  /**
   * Killing the task, which is not the same as handing it back.
   *
   * Handing back returns it to the queue for somebody else; cancelling takes it
   * out of the queue. A task raised against a receipt that was later reversed
   * had neither route out — the route existed on the backend and nothing called
   * it, so the task stayed in the RF queue forever.
   */
  function handleCancel(): void {
    if (!taskId) return;
    cancel.mutate(taskId, {
      onSuccess: () => {
        toast.success("Task cancelled and taken out of the queue");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleClose(): void {
    onOpenChange(false);
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={task ? task.taskNumber : "Putaway task"}
      description={
        task ? `${lines.length} line${lines.length === 1 ? "" : "s"} to put away` : undefined
      }
      className="sm:max-w-lg"
      footer={
        <div className="grid w-full grid-flow-col auto-cols-fr gap-2">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
          {finished || !canPutAway ? null : (
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={handleCancel}
              isPending={cancel.isPending}
              loadingText="Cancelling…"
            >
              Cancel task
            </LoadingButton>
          )}
          {finished || !canPutAway ? null : heldByMe ? (
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={handleAbandon}
              isPending={abandon.isPending}
              loadingText="Handing back…"
            >
              Hand back
            </LoadingButton>
          ) : (
            <LoadingButton
              size="sm"
              onClick={handleClaim}
              isPending={claim.isPending}
              loadingText="Claiming…"
              disabled={heldBySomeoneElse}
            >
              {heldBySomeoneElse ? "Claimed by someone else" : "Claim task"}
            </LoadingButton>
          )}
        </div>
      }
    >
      {detail.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : detail.isError ? (
        <ErrorState
          title="Couldn't load this task"
          description={getErrorMessage(detail.error)}
          onRetry={handleRetry}
          compact
        />
      ) : task ? (
        <div className="flex flex-col gap-3">
          {canConfirm ? (
            <ScanField
              scan={scan}
              label="Scan the pallet or carton you are holding"
              placeholder="Barcode, SKU, lot or serial"
              sticky
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-micro", PUTAWAY_TASK_STATUS_BADGE[task.status])}
            >
              {PUTAWAY_TASK_STATUS_LABEL[task.status]}
            </Badge>
            {heldBySomeoneElse ? (
              <span className="text-xs text-muted-foreground">
                Another operator is walking this task — confirmations are theirs to make.
              </span>
            ) : null}
            {!canPutAway ? (
              <span className="text-xs text-muted-foreground">
                You can see this walk but not confirm against it.
              </span>
            ) : null}
          </div>

          <ul className="flex flex-col gap-2">
            {lines.map((line) => (
              // The key carries what has already been walked on purpose. The row
              // seeds its quantity field from the line's remainder, and a seed is
              // an initial value: after a partial putaway the refetched line has a
              // smaller remainder and a row React kept would still be offering the
              // old one, which the server then refuses. Changing the key remounts
              // it with the new remainder.
              <PutawayLineRow
                key={`${line.id}:${line.quantity_moved}`}
                taskId={task.id}
                line={line}
                disabled={!canPutAway || heldBySomeoneElse || finished}
                isActive={line.id === activeLineId}
                warehouseId={task.warehouseId}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </AppSheet>
  );
}
