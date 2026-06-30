"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function WorkflowDetailError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="Failed to load workflow"
      description="Something went wrong while fetching this workflow."
      onRetry={reset}
      className="flex-1"
    />
  );
}
