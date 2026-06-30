"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function WorkflowsError({ reset }: { reset: () => void }) {
  return <ErrorState title="Failed to load workflows" onRetry={reset} className="flex-1" />;
}
