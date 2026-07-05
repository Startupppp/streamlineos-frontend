"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ApprovalsInboxError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Approvals error"
      fallbackMessage="Failed to load your approvals inbox. Please try again."
    />
  );
}
