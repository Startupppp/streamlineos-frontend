"use client";

import { Button } from "@/components/ui/button";
import type { FormSubmission, FormSubmissionStatus } from "@/types/projects/forms";

interface SubmissionActionsCellProps {
  row: FormSubmission;
  canManage: boolean;
  onView: (row: FormSubmission) => void;
  onStatusUpdate: (row: FormSubmission, status: FormSubmissionStatus) => void;
}

export function SubmissionActionsCell({
  row,
  canManage,
  onView,
  onStatusUpdate,
}: SubmissionActionsCellProps) {
  function handleView() {
    onView(row);
  }
  function handleProcess() {
    onStatusUpdate(row, "processed");
  }
  function handleReject() {
    onStatusUpdate(row, "rejected");
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={handleView}
      >
        View
      </Button>
      {canManage && row.status === "submitted" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-status-success-ink-strong hover:text-status-success-ink-strong"
            onClick={handleProcess}
          >
            Process
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-destructive hover:text-destructive"
            onClick={handleReject}
          >
            Reject
          </Button>
        </>
      )}
    </div>
  );
}
