"use client";

import { Button } from "@/components/ui/button";
import type { FormSubmission } from "@/types/projects/forms";

interface SubmissionActionsCellProps {
  row: FormSubmission;
  onView: (row: FormSubmission) => void;
}

export function SubmissionActionsCell({
  row,
  onView,
}: SubmissionActionsCellProps) {
  function handleView() {
    onView(row);
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
    </div>
  );
}
