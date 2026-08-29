"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppSheet, ErrorState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAbandonPickWave,
  useClaimPickWave,
  usePickWave,
  type PickWaveLine,
} from "@/hooks/api/inventory/picking";
import {
  PICK_WAVE_STATUS_BADGE,
  PICK_WAVE_STATUS_LABEL,
} from "@/features/inventory/lib/inventory-status";
import { PickTaskRow } from "./pick-task-row";
import { PickExceptionDialog } from "./pick-exception-dialog";

interface PickWaveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickListId: number | null;
  /** The signed-in picker, so the sheet can tell "mine" from "someone else's". */
  currentUserId: string | null;
  canPick: boolean;
}

/**
 * The walk itself.
 *
 * Tasks are listed in the order the server sorted them — by location code, so
 * the list is a route through the building rather than a set of errands — and
 * the confirm controls stay disabled until this picker holds the claim. That is
 * the whole point of the claim: two pickers sharing a wave both take goods off
 * the shelf, and only the second one's confirm is refused, by which time the
 * stock has already moved.
 */
export function PickWaveSheet({
  open,
  onOpenChange,
  pickListId,
  currentUserId,
  canPick,
}: PickWaveSheetProps) {
  const [exceptionLine, setExceptionLine] = useState<PickWaveLine | null>(null);
  const wave = usePickWave(pickListId ?? 0, { enabled: open && !!pickListId });
  const claim = useClaimPickWave();
  const abandon = useAbandonPickWave();

  const detail = wave.data;
  const heldByMe = !!detail && detail.assignedTo === currentUserId;
  const heldBySomeoneElse =
    !!detail && detail.assignedTo !== null && detail.assignedTo !== currentUserId;
  const finished = detail?.status === "COMPLETED" || detail?.status === "CANCELLED";

  function handleRetry(): void {
    void wave.refetch();
  }

  function handleClaim(): void {
    if (!pickListId) return;
    claim.mutate(pickListId, {
      onSuccess: () => toast.success("Wave claimed"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleAbandon(): void {
    if (!pickListId) return;
    abandon.mutate(pickListId, {
      onSuccess: () => toast.success("Wave handed back"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleExceptionOpenChange(next: boolean): void {
    if (!next) setExceptionLine(null);
  }

  function handleReportException(line: PickWaveLine): void {
    setExceptionLine(line);
  }

  function handleCloseSheet(): void {
    onOpenChange(false);
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={detail ? detail.pickNumber : "Pick wave"}
        description={
          detail
            ? `${detail.lines.length} task${detail.lines.length === 1 ? "" : "s"} on this walk`
            : undefined
        }
        className="sm:max-w-lg"
        footer={
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleCloseSheet}>
              Close
            </Button>
            {finished || !canPick ? null : heldByMe ? (
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
                {heldBySomeoneElse ? "Claimed by someone else" : "Claim wave"}
              </LoadingButton>
            )}
          </div>
        }
      >
        {wave.isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : wave.isError ? (
          <ErrorState
            title="Couldn't load this wave"
            description={getErrorMessage(wave.error)}
            onRetry={handleRetry}
            compact
          />
        ) : detail ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-micro", PICK_WAVE_STATUS_BADGE[detail.status])}
              >
                {PICK_WAVE_STATUS_LABEL[detail.status]}
              </Badge>
              {heldBySomeoneElse ? (
                <span className="text-xs text-muted-foreground">
                  Another picker is walking this wave — confirmations are theirs to make.
                </span>
              ) : null}
              {!canPick ? (
                <span className="text-xs text-muted-foreground">
                  You can see this walk but not confirm against it.
                </span>
              ) : null}
            </div>

            <ul className="flex flex-col gap-2">
              {detail.lines.map((line) => (
                <PickTaskRow
                  key={line.id}
                  pickListId={detail.id}
                  line={line}
                  disabled={!canPick || heldBySomeoneElse || finished}
                  onReportException={handleReportException}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </AppSheet>

      <PickExceptionDialog
        open={exceptionLine !== null}
        onOpenChange={handleExceptionOpenChange}
        pickListId={pickListId ?? 0}
        line={exceptionLine}
      />
    </>
  );
}
