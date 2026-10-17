"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useCan } from "@/hooks/api/access";
import { useBulkMutateFeedbucketSubmissions } from "@/hooks/api/feedbucket";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  BulkFeedbucketSubmissionsResult,
  FeedbucketBulkAction,
  FeedbucketSubmissionFilters,
  FeedbucketSubmissionPriority,
  FeedbucketSubmissionStatus,
} from "@/types/feedbucket";

const ALL_STATUSES: FeedbucketSubmissionStatus[] = ["open", "in_progress", "resolved", "archived"];
const STATUS_LABELS: Record<FeedbucketSubmissionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  archived: "Archived",
};

const PRIORITIES: FeedbucketSubmissionPriority[] = ["low", "medium", "high", "urgent"];

const PRIORITY_LABELS: Record<FeedbucketSubmissionPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const BULK_SELECTION_CAP = 100;

interface SubmissionBulkToolbarProps {
  selectedIds: number[];
  filters: FeedbucketSubmissionFilters;
  onClearSelection: () => void;
}

function describeOutcome(result: BulkFeedbucketSubmissionsResult, verb: string): string {
  const applied = `${result.succeeded} of ${result.requested} ${verb}`;
  return result.skipped === 0
    ? applied
    : `${applied} — ${result.skipped} no longer matched the filters and were left unchanged`;
}

export function SubmissionBulkToolbar({
  selectedIds,
  filters,
  onClearSelection,
}: SubmissionBulkToolbarProps) {
  const canUpdate = useCan("feedbucket:submissions:update");
  const canAssign = useCan("feedbucket:submissions:assign");
  const canDelete = useCan("feedbucket:submissions:delete");
  const bulk = useBulkMutateFeedbucketSubmissions();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const overCap = selectedIds.length > BULK_SELECTION_CAP;

  function apply(action: FeedbucketBulkAction, verb: string) {
    bulk.mutate(
      { submissionIds: selectedIds, action, filters },
      {
        onSuccess: (result) => {
          toast.success(describeOutcome(result, verb));
          setConfirmingDelete(false);
          onClearSelection();
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function handleStatusChange(value: string) {
    const status = ALL_STATUSES.find((candidate) => candidate === value);
    if (!status) return;
    apply({ type: "status", status }, "updated");
  }

  function handlePriorityChange(value: string) {
    const priority = PRIORITIES.find((candidate) => candidate === value);
    if (!priority) return;
    apply({ type: "priority", priority }, "updated");
  }

  function handleAssigneeChange(value: string) {
    apply({ type: "assign", assigneeId: value === "" ? null : value }, "reassigned");
  }

  function handleRequestDelete() {
    setConfirmingDelete(true);
  }

  function handleConfirmDelete() {
    apply({ type: "delete" }, "deleted");
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setConfirmingDelete(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
      <span className="text-sm font-medium tabular-nums">
        {selectedIds.length} selected on this page
      </span>

      {overCap ? (
        <span className="text-sm text-status-danger-ink-strong">
          Bulk actions apply to at most {BULK_SELECTION_CAP} submissions at a time.
        </span>
      ) : null}

      {canUpdate ? (
        <Select onValueChange={handleStatusChange} disabled={bulk.isPending || overCap}>
          <SelectTrigger className="h-9 w-[150px] text-sm" aria-label="Set status for selected submissions">
            <SelectValue placeholder="Set status…" />
          </SelectTrigger>
          <SelectContent>
            {ALL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {canUpdate ? (
        <Select onValueChange={handlePriorityChange} disabled={bulk.isPending || overCap}>
          <SelectTrigger className="h-9 w-[150px] text-sm" aria-label="Set priority for selected submissions">
            <SelectValue placeholder="Set priority…" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {canAssign ? (
        <UserCombobox
          value=""
          onChange={handleAssigneeChange}
          placeholder="Assign to…"
          allowUnassigned
          disabled={bulk.isPending || overCap}
          className="w-[170px]"
        />
      ) : null}

      {canDelete ? (
        <LoadingButton
          type="button"
          variant="destructive"
          size="sm"
          isPending={bulk.isPending}
          disabled={overCap}
          onClick={handleRequestDelete}
        >
          Delete selected
        </LoadingButton>
      ) : null}

      <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
        Clear selection
      </Button>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={handleDeleteDialogChange}
        destructive
        title={`Delete ${selectedIds.length} submissions?`}
        description="These submissions are removed from the inbox and can no longer be opened. Submissions that no longer match your filters are left untouched and reported back. You cannot undo this from here."
        confirmLabel="Delete submissions"
        isPending={bulk.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
