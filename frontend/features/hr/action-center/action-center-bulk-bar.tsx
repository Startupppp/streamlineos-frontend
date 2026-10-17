"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { RejectReasonDialog } from "@/features/hr/action-center/reject-reason-dialog";
import {
  sharedBulkGroup,
  type ActionCenterItem,
} from "@/features/hr/action-center/queue-item";
import type { QueueDecision } from "@/features/hr/action-center/use-action-center-decisions";

interface ActionCenterBulkBarProps {
  selected: readonly ActionCenterItem[];
  isPending: boolean;
  onClear: () => void;
  onDecideMany: (
    items: readonly ActionCenterItem[],
    decision: QueueDecision,
    reason: string,
  ) => void;
}

export function ActionCenterBulkBar({
  selected,
  isPending,
  onClear,
  onDecideMany,
}: ActionCenterBulkBarProps) {
  const [rejecting, setRejecting] = useState(false);
  const group = sharedBulkGroup(selected);
  const enabled = group !== null && !isPending;

  function handleApproveAll(): void {
    onDecideMany(selected, "approve", "");
  }

  function handleRequestReject(): void {
    setRejecting(true);
  }

  function handleConfirmReject(reason: string): void {
    setRejecting(false);
    onDecideMany(selected, "reject", reason);
  }

  if (selected.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
      <span className="text-dense font-medium tabular-nums">
        {selected.length} selected
      </span>

      {group === null ? (
        <span className="text-dense text-status-danger-ink-strong">
          Bulk decide needs one request type. Clear the selection and pick rows
          of a single type.
        </span>
      ) : (
        <span className="text-dense text-muted-foreground">
          {selected[0].type}
        </span>
      )}

      <LoadingButton
        size="sm"
        variant="outline"
        isPending={isPending}
        disabled={!enabled}
        onClick={handleApproveAll}
        className="min-h-11 sm:min-h-8"
      >
        Approve selected
      </LoadingButton>

      <Button
        size="sm"
        variant="ghost"
        disabled={!enabled}
        onClick={handleRequestReject}
        className="min-h-11 sm:min-h-8"
      >
        Reject selected
      </Button>

      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear selection
      </Button>

      <RejectReasonDialog
        open={rejecting}
        onOpenChange={setRejecting}
        subject={`${selected.length} selected requests`}
        isPending={isPending}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
}
