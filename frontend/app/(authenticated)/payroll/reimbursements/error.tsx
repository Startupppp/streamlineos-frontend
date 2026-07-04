"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ReimbursementsError({
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
      title="Reimbursements error"
      fallbackMessage="Failed to load reimbursements. Please try again."
    />
  );
}
