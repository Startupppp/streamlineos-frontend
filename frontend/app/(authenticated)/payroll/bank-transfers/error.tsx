"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function BankTransfersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ReportingRouteErrorBoundary
      error={error}
      reset={reset}
      title="Bank transfers error"
      fallbackMessage="Failed to load bank transfers. Please try again."
    />
  );
}
