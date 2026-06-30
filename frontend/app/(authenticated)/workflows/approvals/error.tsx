"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function ApprovalsError({ reset }: { reset: () => void }) {
  return <ErrorState title="Failed to load approvals" onRetry={reset} className="flex-1" />;
}
