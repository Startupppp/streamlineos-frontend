"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatRelativeTime } from "@/lib/date-utils";
import {
  hrmsListStagger,
  hrmsRowCollapse,
  hrmsRowCollapseReduced,
  hrmsTransition,
  hrmsVariants,
} from "@/lib/hrms/motion";
import { RejectReasonDialog } from "@/features/hr/action-center/reject-reason-dialog";
import type { ActionCenterItem } from "@/features/hr/action-center/queue-item";
import type { QueueDecision } from "@/features/hr/action-center/use-action-center-decisions";

interface ActionCenterRowProps {
  item: ActionCenterItem;
  index: number;
  selected: boolean;
  selectable: boolean;
  decidable: boolean;
  isDeciding: boolean;
  onToggleSelected: (itemId: string) => void;
  onOpenRequester: (item: ActionCenterItem) => void;
  onDecide: (
    item: ActionCenterItem,
    decision: QueueDecision,
    reason: string,
  ) => void;
}

export function ActionCenterRow({
  item,
  index,
  selected,
  selectable,
  decidable,
  isDeciding,
  onToggleSelected,
  onOpenRequester,
  onDecide,
}: ActionCenterRowProps) {
  const reduced = useReducedMotion();
  const [rejecting, setRejecting] = useState(false);
  const cutoffTone = statusToneClasses("warning");

  function handleToggleSelected(): void {
    onToggleSelected(item.id);
  }

  function handleOpenRequester(): void {
    onOpenRequester(item);
  }

  function handleApprove(): void {
    onDecide(item, "approve", "");
  }

  function handleRequestReject(): void {
    setRejecting(true);
  }

  function handleConfirmReject(reason: string): void {
    setRejecting(false);
    onDecide(item, "reject", reason);
  }

  return (
    <motion.li
      layout={reduced ? false : "position"}
      initial="hidden"
      animate="show"
      exit="hidden"
      variants={hrmsVariants(reduced, hrmsRowCollapse, hrmsRowCollapseReduced)}
      transition={hrmsTransition(reduced, hrmsListStagger(index))}
      className="overflow-hidden border-b border-border/60 last:border-b-0"
    >
      <div className="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-3">
        <Checkbox
          checked={selected}
          disabled={!selectable}
          onCheckedChange={handleToggleSelected}
          aria-label={`Select ${item.type} from ${item.requesterLabel}`}
          className="mt-0.5 shrink-0 self-start sm:mt-0 sm:self-auto"
        />

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {item.requester ? (
              <button
                type="button"
                onClick={handleOpenRequester}
                className="truncate text-sm font-medium text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {item.requesterLabel}
              </button>
            ) : (
              <span className="truncate text-sm font-medium text-foreground">
                {item.requesterLabel}
              </span>
            )}
            <span className="text-dense text-muted-foreground">·</span>
            <span className="truncate text-dense text-muted-foreground">
              {item.type}
            </span>
            <span className="text-dense text-muted-foreground">·</span>
            <span className="text-dense tabular-nums text-muted-foreground">
              {item.dateRange}
            </span>
            {item.deadlineAffected ? (
              <Badge
                variant="outline"
                className={`text-micro ${cutoffTone.surface} ${cutoffTone.inkStrong} ${cutoffTone.rule}`}
              >
                Affects cutoff
              </Badge>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-dense text-muted-foreground">
            {item.policyNote ? (
              <span className="line-clamp-1">{item.policyNote}</span>
            ) : null}
            {item.submittedAt ? (
              <span className="tabular-nums">
                {formatRelativeTime(item.submittedAt)}
              </span>
            ) : null}
          </div>
        </div>

        {decidable ? (
          <div className="flex shrink-0 items-center gap-2">
            <LoadingButton
              size="sm"
              variant="outline"
              isPending={isDeciding}
              onClick={handleApprove}
              className="min-h-11 flex-1 sm:min-h-8 sm:flex-none"
            >
              Approve
            </LoadingButton>
            <Button
              size="sm"
              variant="ghost"
              disabled={isDeciding}
              onClick={handleRequestReject}
              className="min-h-11 flex-1 sm:min-h-8 sm:flex-none"
            >
              Reject
            </Button>
          </div>
        ) : null}
      </div>

      <RejectReasonDialog
        open={rejecting}
        onOpenChange={setRejecting}
        subject={`${item.type} · ${item.dateRange}`}
        isPending={isDeciding}
        onConfirm={handleConfirmReject}
      />
    </motion.li>
  );
}
