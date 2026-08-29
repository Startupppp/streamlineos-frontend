"use client";

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
  useClaimPutawayTask,
  usePutawayTask,
} from "@/hooks/api/inventory/putaway";
import {
  PUTAWAY_TASK_STATUS_BADGE,
  PUTAWAY_TASK_STATUS_LABEL,
} from "@/features/inventory/lib/inventory-status";
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
  const detail = usePutawayTask(taskId ?? 0, { enabled: open && !!taskId });
  const claim = useClaimPutawayTask();
  const abandon = useAbandonPutawayTask();

  const task = detail.data?.task;
  const lines = detail.data?.lines ?? [];
  const heldByMe = !!task && task.assignedTo === currentUserId;
  const heldBySomeoneElse =
    !!task && task.assignedTo !== null && task.assignedTo !== currentUserId;
  const finished = task?.status === "COMPLETED" || task?.status === "CANCELLED";

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
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
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
              />
            ))}
          </ul>
        </div>
      ) : null}
    </AppSheet>
  );
}
