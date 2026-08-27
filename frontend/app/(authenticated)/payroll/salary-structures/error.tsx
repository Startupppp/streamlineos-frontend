"use client";

import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function SalaryStructuresError({
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
      title="Salary structures error"
      fallbackMessage="Failed to load salary structures. Please try again."
    />
  );
}
